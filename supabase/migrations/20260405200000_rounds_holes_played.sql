-- Add holes_played column to rounds table (9 or 18, default 18)
ALTER TABLE public.rounds ADD COLUMN holes_played integer DEFAULT 18 NOT NULL;

-- Add check constraint to ensure valid values
ALTER TABLE public.rounds ADD CONSTRAINT rounds_holes_played_check CHECK (holes_played IN (9, 18));
