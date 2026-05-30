-- Freelancer specialty per client — drives onboarding reveal sample type
-- Run in Supabase SQL editor or via migration tool

alter table public.clients
  add column if not exists freelancer_type text
  not null default 'general'
  check (freelancer_type in (
    'copywriter',
    'social',
    'content',
    'ux',
    'pr',
    'general'
  ));

-- Backfill existing clients to 'general'
update public.clients
  set freelancer_type = 'general'
  where freelancer_type is null;
