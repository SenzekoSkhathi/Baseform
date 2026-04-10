-- Harmonize legacy applications schema safely.
-- If profile_id exists and student_id does not, rename profile_id to student_id.
-- If both exist, backfill student_id from profile_id where needed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'profile_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'student_id'
  ) THEN
    ALTER TABLE public.applications RENAME COLUMN profile_id TO student_id;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'profile_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'student_id'
  ) THEN
    UPDATE public.applications
    SET student_id = profile_id
    WHERE student_id IS NULL;
  END IF;
END;
$$;
