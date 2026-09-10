ALTER TABLE public.computer_events
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS duration double precision,
  ADD COLUMN IF NOT EXISTS screenshot_url text;