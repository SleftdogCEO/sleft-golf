-- Allow anyone to insert courses (for seeding and user-added courses)
DO $$ BEGIN
  CREATE POLICY "Anyone can insert courses" ON courses FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
