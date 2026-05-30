-- Rate limiting: monthly reset anchor + atomic increment

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS messages_reset_at timestamptz
    NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month');

CREATE OR REPLACE FUNCTION public.increment_message_count(user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
  SET message_count = message_count + 1
  WHERE id = user_id;
$$;
