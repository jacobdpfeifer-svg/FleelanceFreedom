-- Atomic quota: reset-if-due + free-limit check + increment, single locked txn.
create or replace function public.consume_message(p_user_id uuid)
returns table(allowed boolean, plan text, message_count int, messages_reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_plan text; v_count int; v_reset timestamptz; v_limit constant int := 50;
begin
  select u.plan, u.message_count, u.messages_reset_at
    into v_plan, v_count, v_reset
  from public.users u where u.id = p_user_id for update;
  if not found then
    return query select false, null::text, 0, null::timestamptz; return;
  end if;
  if now() >= v_reset then
    loop v_reset := v_reset + interval '1 month'; exit when v_reset > now(); end loop;
    v_count := 0;
  end if;
  if v_plan = 'free' and v_count >= v_limit then
    update public.users set message_count = v_count, messages_reset_at = v_reset
      where id = p_user_id;
    return query select false, v_plan, v_count, v_reset; return;
  end if;
  v_count := v_count + 1;
  update public.users set message_count = v_count, messages_reset_at = v_reset
    where id = p_user_id;
  return query select true, v_plan, v_count, v_reset;
end; $$;

-- Refund on downstream failure (floor at 0).
create or replace function public.refund_message(p_user_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.users set message_count = greatest(message_count - 1, 0)
  where id = p_user_id;
$$;

revoke all on function public.consume_message(uuid) from public;
revoke all on function public.refund_message(uuid) from public;
grant execute on function public.consume_message(uuid) to service_role;
grant execute on function public.refund_message(uuid) to service_role;

-- Indexes for hot paths.
create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_chat_sessions_client_created
  on public.chat_sessions(client_id, created_at desc);

-- One Stripe customer per row (nulls allowed).
create unique index if not exists uq_users_stripe_customer
  on public.users(stripe_customer_id) where stripe_customer_id is not null;

-- Webhook idempotency ledger.
create table if not exists public.stripe_events (
  id text primary key,
  processed_at timestamptz not null default now()
);
grant all on public.stripe_events to service_role;
