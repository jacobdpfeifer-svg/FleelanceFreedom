-- Table-level grants for authenticated reads/writes (Supabase usually adds these,
-- but some projects created via SQL editor miss them).
grant usage on schema public to authenticated, service_role;

grant select, insert, update on public.users to authenticated;
grant all on public.users to service_role;

grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;

grant select, insert, update, delete on public.client_memory to authenticated;
grant all on public.client_memory to service_role;

grant select, insert, update, delete on public.chat_sessions to authenticated;
grant all on public.chat_sessions to service_role;
