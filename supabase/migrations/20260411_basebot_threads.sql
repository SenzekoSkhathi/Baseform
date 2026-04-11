CREATE TABLE IF NOT EXISTS basebot_threads (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'New chat',
  preview     TEXT        NOT NULL DEFAULT '',
  messages    JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE basebot_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own threads"
  ON basebot_threads FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS basebot_threads_user_id_idx
  ON basebot_threads (user_id, updated_at DESC);
