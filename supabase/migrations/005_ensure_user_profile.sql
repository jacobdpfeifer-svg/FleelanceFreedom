-- Reliable profile bootstrap: runs as security definer so RLS does not block first insert.
create or replace function public.ensure_user_profile(user_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.users (id, email)
  values (auth.uid(), user_email)
  on conflict (id) do update
    set email = excluded.email
    where public.users.email is distinct from excluded.email;
end;
$$;

revoke all on function public.ensure_user_profile(text) from public;
grant execute on function public.ensure_user_profile(text) to authenticated;
