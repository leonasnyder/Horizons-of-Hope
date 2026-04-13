-- ============================================================
-- PA Tasks — run once in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS pa_tasks (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  notes       TEXT,
  is_completed INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pa_tasks_user_id_idx ON pa_tasks(user_id);
