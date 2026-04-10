-- Fix the applications table student_id column.
-- Supabase commonly creates this as 'user_id'. This migration renames it to
-- 'student_id' to match the codebase, or adds it if neither exists.

DO $$
BEGIN
  -- Case 1: column is called 'user_id' — rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.applications RENAME COLUMN user_id TO student_id;

  -- Case 2: column doesn't exist at all — add it
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'student_id'
  ) THEN
    ALTER TABLE public.applications
      ADD COLUMN student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  -- Case 3: already called 'student_id' — nothing to do
END;
$$;
