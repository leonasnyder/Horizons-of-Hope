-- ============================================================
-- Horizons of Hope — add `days_of_week` to activity_defaults
--
-- The M-Thu (and every other partial-week) recurrence pattern is
-- stored in activity_defaults.days_of_week as a comma-separated list
-- of day numbers (0=Sun, 1=Mon, ..., 6=Sat). A NULL value means
-- "every day".
--
-- The app's code has assumed this column exists for a while, but it
-- was never in the committed schema. If the column is missing in
-- production, every recurring activity is treated as "every day" by
-- the scheduler's filter logic, and activities that should only
-- appear M-Thu will leak into Fri/Sat/Sun.
--
-- Run this ONCE in Supabase Dashboard → SQL Editor.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is a no-op if it's there.
-- ============================================================

ALTER TABLE activity_defaults
  ADD COLUMN IF NOT EXISTS days_of_week TEXT;
