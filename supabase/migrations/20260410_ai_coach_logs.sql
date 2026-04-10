-- AI coach usage log — one row per Claude API call from the /ai/coach endpoint.
-- Referenced in: Backend/src/routes/ai.ts, account delete route, admin metrics route.

CREATE TABLE IF NOT EXISTS public.ai_coach_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model         text        NOT NULL,
  input_tokens  integer     NOT NULL DEFAULT 0,
  output_tokens integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for per-student queries (metrics, account delete).
CREATE INDEX IF NOT EXISTS ai_coach_logs_student_id_idx
  ON public.ai_coach_logs (student_id);

-- RLS: students can view their own logs; writes go through the service-role backend.
ALTER TABLE public.ai_coach_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own AI logs"
  ON public.ai_coach_logs FOR SELECT
  USING (auth.uid() = student_id);
