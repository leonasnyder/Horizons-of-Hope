-- Run this ONCE in Supabase Dashboard → SQL Editor

-- Add user_id to user-scoped tables
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE schedule_entries
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE goal_responses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- activity_usage_log: change unique constraint to include user_id
ALTER TABLE activity_usage_log
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE activity_usage_log
  DROP CONSTRAINT IF EXISTS activity_usage_log_activity_id_week_start_key;
DELETE FROM activity_usage_log WHERE user_id IS NULL;
ALTER TABLE activity_usage_log
  ADD CONSTRAINT activity_usage_log_user_activity_week_key
  UNIQUE(user_id, activity_id, week_start);

-- app_settings: change primary key to (user_id, key)
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
DELETE FROM app_settings WHERE user_id IS NULL;
ALTER TABLE app_settings ADD PRIMARY KEY (user_id, key);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_user_id ON schedule_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_responses_user_id ON goal_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_usage_log_user_id ON activity_usage_log(user_id);
