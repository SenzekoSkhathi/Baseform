-- Ensure the applications table has all columns the app expects.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS student_id    uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS university_id bigint  REFERENCES public.universities(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS faculty_id    bigint  REFERENCES public.faculties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status        text    NOT NULL DEFAULT 'planning',
  ADD COLUMN IF NOT EXISTS notes         text,
  ADD COLUMN IF NOT EXISTS applied_at    timestamptz NOT NULL DEFAULT now();
