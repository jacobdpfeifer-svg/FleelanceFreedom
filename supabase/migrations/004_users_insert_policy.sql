-- Allow signed-in users to create their own public.users row on first use
-- (fallback when the auth.users trigger did not run).
-- Safe to re-run: skips if the policy already exists.

drop policy if exists "users: insert own row" on public.users;

create policy "users: insert own row"
  on public.users for insert
  with check (auth.uid() = id);
