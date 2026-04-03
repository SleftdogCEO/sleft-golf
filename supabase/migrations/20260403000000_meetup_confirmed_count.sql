-- Track how many players are confirmed (including off-app guests)
-- so the Board can show correct open spots
ALTER TABLE public.meetups
  ADD COLUMN IF NOT EXISTS confirmed_count integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.meetups.confirmed_count IS 'Number of confirmed players including organizer and off-app guests';
