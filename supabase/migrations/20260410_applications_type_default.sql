-- Add a default value to the type column so inserts that omit it don't fail.
ALTER TABLE public.applications
  ALTER COLUMN type SET DEFAULT 'university';

-- Backfill any existing rows that have a null type.
UPDATE public.applications SET type = 'university' WHERE type IS NULL;
