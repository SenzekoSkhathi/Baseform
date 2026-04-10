-- Email agent tables for Gmail-connected application status tracking.

-- Stores one Gmail OAuth connection per user.
CREATE TABLE IF NOT EXISTS public.email_connections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         text        NOT NULL DEFAULT 'gmail',
  email_address    text        NOT NULL,
  access_token     text        NOT NULL,
  refresh_token    text        NOT NULL,
  token_expiry     timestamptz,
  is_active        boolean     NOT NULL DEFAULT true,
  last_scanned_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Audit log — one row per processed email, prevents double-processing.
CREATE TABLE IF NOT EXISTS public.email_scan_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id   bigint      REFERENCES public.applications(id) ON DELETE SET NULL,
  gmail_message_id text        NOT NULL,
  email_subject    text,
  email_from       text,
  email_date       timestamptz,
  detected_status  text,
  previous_status  text,
  action_taken     text        NOT NULL DEFAULT 'no_change',
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gmail_message_id)
);

-- RLS: users can only see their own rows.
ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_scan_logs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own email connection"
  ON public.email_connections FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users see own scan logs"
  ON public.email_scan_logs FOR SELECT
  USING (auth.uid() = user_id);
