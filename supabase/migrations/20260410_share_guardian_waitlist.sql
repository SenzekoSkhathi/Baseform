-- Share tokens, guardian portal tokens, and Grade 11 waitlist.

-- ── Share + guardian tokens ──────────────────────────────────────────────────
-- Every profile gets a unique share_token (for the public APS card) and a
-- guardian_token (for the read-only parent portal). Both default to a fresh
-- UUID so existing rows are backfilled automatically.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_token    uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS guardian_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_share_token_idx
  ON public.profiles (share_token);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_guardian_token_idx
  ON public.profiles (guardian_token);

-- ── Grade 11 waitlist ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text        NOT NULL,
  full_name         text,
  aps               integer,
  province          text,
  field_of_interest text,
  grade_year        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

-- No RLS — inserts are via service-role API route, no user session required.
