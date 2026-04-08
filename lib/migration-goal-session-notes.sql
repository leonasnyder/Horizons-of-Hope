CREATE TABLE IF NOT EXISTS goal_session_notes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  notes TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, goal_id, date)
);

CREATE INDEX IF NOT EXISTS idx_goal_session_notes_user_goal_date
  ON goal_session_notes(user_id, goal_id, date);
