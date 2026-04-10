-- Add missing columns to the profiles table.
-- These are referenced throughout the app but were never added to the DB schema.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_name    text,
  ADD COLUMN IF NOT EXISTS grade_year     text,
  ADD COLUMN IF NOT EXISTS financial_need text;

-- Backfill grade_year from the existing integer 'grade' column (e.g. 12 → 'Grade 12')
UPDATE public.profiles
  SET grade_year = 'Grade ' || grade
  WHERE grade IS NOT NULL AND grade_year IS NULL;
