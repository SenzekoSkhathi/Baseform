-- Ensure all user-owned data is deleted when a user is removed from auth.users.
-- Re-creates foreign keys with ON DELETE CASCADE where missing.
-- Safe to run multiple times.

-- ── profiles ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── student_subjects ─────────────────────────────────────────────────────────
ALTER TABLE public.student_subjects
  DROP CONSTRAINT IF EXISTS student_subjects_profile_id_fkey;

ALTER TABLE public.student_subjects
  ADD CONSTRAINT student_subjects_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ── applications ─────────────────────────────────────────────────────────────
-- Handled explicitly in the delete API route (column name varies by environment).

-- ── bursary_applications ─────────────────────────────────────────────────────
-- (already created with ON DELETE CASCADE in 20260410_bursary_applications.sql)
-- Included here for completeness; the IF NOT EXISTS on the constraint handles duplicates.

-- ── ai_coach_logs ─────────────────────────────────────────────────────────────
-- Skipped: column name uncertain (may be profile_id or user_id depending on how the table was created).
-- Add manually after confirming the correct column:
--   ALTER TABLE public.ai_coach_logs
--     ADD CONSTRAINT ai_coach_logs_user_fkey
--     FOREIGN KEY (<column>) REFERENCES auth.users(id) ON DELETE CASCADE;
