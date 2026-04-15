-- BaseBot Memory: persists facts the AI has learned about each user across conversations
CREATE TABLE IF NOT EXISTS basebot_memory (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL,       -- snake_case fact key, e.g. "career_goal"
  value       TEXT        NOT NULL,       -- fact value, e.g. "become a doctor"
  category    TEXT        NOT NULL DEFAULT 'general',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

ALTER TABLE basebot_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memories"
  ON basebot_memory FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX basebot_memory_user_idx ON basebot_memory (user_id, updated_at DESC);
