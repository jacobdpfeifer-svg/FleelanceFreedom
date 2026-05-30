-- Stage 3: Spooky Accurate Client Profiles
-- Non-breaking additions only — all columns nullable with safe defaults

ALTER TABLE public.client_memory
  ADD COLUMN IF NOT EXISTS samples        jsonb    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS vocab_use      text[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vocab_avoid    text[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sentence_style jsonb    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS structure      jsonb    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rejections     jsonb    NOT NULL DEFAULT '[]';
