-- RLS policies for the applications table.

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own applications" ON public.applications;
DROP POLICY IF EXISTS "students can read own applications" ON public.applications;
DROP POLICY IF EXISTS "students can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "students can update own applications" ON public.applications;
DROP POLICY IF EXISTS "students can delete own applications" ON public.applications;

CREATE POLICY "students can read own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "students can insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "students can update own applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "students can delete own applications"
  ON public.applications FOR DELETE
  USING (auth.uid() = student_id);
