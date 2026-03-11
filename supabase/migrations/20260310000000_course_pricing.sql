-- Add pricing columns to the courses table
-- price_tier: 1=$, 2=$$, 3=$$$, 4=$$$$
-- green_fee_estimate: rough dollar amount for a typical round
-- is_private: whether the course requires membership

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price_tier integer CHECK (price_tier BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS green_fee_estimate integer,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.courses.price_tier IS '1=$(<50), 2=$$($50-100), 3=$$$($100-200), 4=$$$$($200+/private)';
COMMENT ON COLUMN public.courses.green_fee_estimate IS 'Approximate green fee in USD for a typical round';
COMMENT ON COLUMN public.courses.is_private IS 'True if the course requires club membership to play';
