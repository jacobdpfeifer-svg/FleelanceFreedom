-- ============================================================
-- Freelance Freedom: initial schema + RLS
-- Run in Supabase SQL Editor or via `supabase db push`
-- ============================================================

-- users (mirrors auth.users — one row per account)
create table if not exists public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null,
  stripe_customer_id text,
  plan             text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  message_count    int  not null default 0,
  messages_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at       timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: select own row"  on public.users for select using (auth.uid() = id);
create policy "users: update own row"  on public.users for update using (auth.uid() = id);

-- auto-create users row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- clients
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  industry   text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients: all own rows" on public.clients
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- client_memory  (one row per client, upserted)
create table if not exists public.client_memory (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null unique references public.clients(id) on delete cascade,
  brand_voice       text,
  tone_rules        text[]   not null default '{}',
  decisions         jsonb    not null default '[]',
  sample_copy       text,
  negative_examples text,
  audience_profile  text,
  updated_at        timestamptz not null default now()
);

alter table public.client_memory enable row level security;

create policy "client_memory: own via clients" on public.client_memory
  using (
    exists (
      select 1 from public.clients
      where clients.id = client_memory.client_id
        and clients.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients
      where clients.id = client_memory.client_id
        and clients.user_id = auth.uid()
    )
  );


-- chat_sessions
create table if not exists public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  messages   jsonb not null default '[]',
  task_type  text not null default 'general',
  created_at timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;

create policy "chat_sessions: own via clients" on public.chat_sessions
  using (
    exists (
      select 1 from public.clients
      where clients.id = chat_sessions.client_id
        and clients.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients
      where clients.id = chat_sessions.client_id
        and clients.user_id = auth.uid()
    )
  );
