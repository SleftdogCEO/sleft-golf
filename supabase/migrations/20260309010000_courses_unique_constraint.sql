-- Add unique constraint on (name, city) for courses table
-- Required for upsert deduplication in seed-courses.mjs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_name_city_unique'
  ) THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_name_city_unique UNIQUE (name, city);
  END IF;
END $$;
