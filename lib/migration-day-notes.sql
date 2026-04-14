-- ============================================================
-- Horizons of Hope — Daily Notes table
-- Run this in the Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS hoh_day_notes (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_date   TEXT NOT NULL,          -- 'YYYY-MM-DD'
  content     TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, note_date)
);

CREATE INDEX IF NOT EXISTS hoh_day_notes_user_date_idx
  ON hoh_day_notes(user_id, note_date);
