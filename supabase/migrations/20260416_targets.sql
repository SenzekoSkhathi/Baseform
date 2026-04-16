-- Target Wishlist for Grade 11 learners
-- Allows learners to save programmes they want to apply to in Grade 12

CREATE TABLE IF NOT EXISTS targets (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  faculty_id    BIGINT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  university_id BIGINT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, faculty_id)
);

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own targets"
  ON targets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX targets_user_id_idx ON targets (user_id, created_at DESC);
