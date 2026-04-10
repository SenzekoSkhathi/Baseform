-- Tracks every email notification that has been sent.
-- The unique constraint on (user_id, notification_type, reference_id) prevents
-- the same reminder from being sent twice.

CREATE TABLE IF NOT EXISTS public.notification_sent_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text        NOT NULL,
  -- deadline_30d | deadline_7d | deadline_1d | guardian_status_update
  reference_id      text        NOT NULL,
  -- for deadlines: "{application_id}" ; for guardian: "{application_id}_{status}"
  email_address     text        NOT NULL,
  sent_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, reference_id)
);

ALTER TABLE public.notification_sent_log ENABLE ROW LEVEL SECURITY;

-- Service-role key bypasses RLS; no user-facing policy needed for this table.
