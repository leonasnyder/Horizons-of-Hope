-- ============================================================
-- Horizons of Hope — PostgreSQL schema
-- Run this once in the Supabase SQL Editor (Database > SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  color TEXT DEFAULT '#F97316',
  is_default INTEGER DEFAULT 1,
  is_archived INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_defaults (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id),
  default_time TEXT NOT NULL,
  default_duration INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER REFERENCES activities(id),
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  notes TEXT,
  is_completed INTEGER DEFAULT 0,
  removed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_usage_log (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER REFERENCES activities(id),
  week_start TEXT NOT NULL,
  times_scheduled INTEGER DEFAULT 0,
  UNIQUE(activity_id, week_start)
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0EA5E9',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goal_subcategories (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id),
  response_type TEXT NOT NULL CHECK(response_type IN ('correct','incorrect')),
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS goal_responses (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id),
  subcategory_id INTEGER REFERENCES goal_subcategories(id),
  response_type TEXT NOT NULL CHECK(response_type IN ('correct','incorrect')),
  date TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_notes TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS activity_sub_activities (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id),
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS schedule_entry_sub_activities (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES schedule_entries(id),
  sub_activity_id INTEGER REFERENCES activity_sub_activities(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  completed INTEGER DEFAULT 0
);

-- ============================================================
-- Seed data (only inserts if tables are empty)
-- ============================================================

INSERT INTO categories (name, color, sort_order) VALUES
  ('Social',        '#A855F7', 0),
  ('Motor Skills',  '#3B82F6', 1),
  ('Communication', '#22C55E', 2),
  ('Life Skills',   '#EAB308', 3),
  ('Academic',      '#EC4899', 4),
  ('Other',         '#6B7280', 5)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  act_count INTEGER;
  id1 INTEGER; id2 INTEGER; id3 INTEGER; id4 INTEGER;
  id5 INTEGER; id6 INTEGER; id7 INTEGER; id8 INTEGER;
  g1 INTEGER; g2 INTEGER;
BEGIN
  SELECT COUNT(*) INTO act_count FROM activities;
  IF act_count > 0 THEN RETURN; END IF;

  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Morning greeting',   'Group hello circle, name recognition',               'Social',        1) RETURNING id INTO id1;
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Ball toss',          'Gross motor skills, catching and throwing',           'Motor Skills',  1) RETURNING id INTO id2;
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('AAC device practice','Core vocabulary navigation on device',                'Communication', 1) RETURNING id INTO id3;
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Snack time',         'Self-feeding, utensil use, requesting',               'Life Skills',   1) RETURNING id INTO id4;
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Puzzle activity',    'Fine motor, shape recognition',                       'Academic',      1) RETURNING id INTO id5;
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Music and movement', 'Rhythm, following directions, body awareness',        'Social',        1) RETURNING id INTO id6;
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Handwashing routine','Step-by-step independence practice',                  'Life Skills',   1) RETURNING id INTO id7;
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Matching game',      'Visual discrimination, turn taking',                  'Academic',      1) RETURNING id INTO id8;
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Outdoor walk',       'Gross motor, sensory input, community navigation',    'Motor Skills',  0);
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Read-aloud',         'Listening comprehension, vocabulary',                 'Academic',      0);
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Art project',        'Fine motor, creativity, following instructions',      'Motor Skills',  0);
  INSERT INTO activities (name, description, category, is_default) VALUES
    ('Cooking/baking',     'Sequencing, math concepts, life skills',              'Life Skills',   0);

  INSERT INTO activity_defaults (activity_id, default_time, default_duration) VALUES
    (id1, '08:00', 30), (id2, '09:00', 30), (id3, '09:30', 30), (id4, '10:00', 30),
    (id5, '10:30', 30), (id6, '11:00', 30), (id7, '11:30', 15), (id8, '13:00', 30);

  INSERT INTO goals (name, description, color) VALUES
    ('Communication goal',   'Track use of AAC device and verbal attempts', '#0EA5E9') RETURNING id INTO g1;
  INSERT INTO goals (name, description, color) VALUES
    ('Behavior regulation',  'Track self-regulation responses',             '#22C55E') RETURNING id INTO g2;

  INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order) VALUES
    (g1, 'correct',   'Used AAC device',                       1),
    (g1, 'correct',   'Used clear verbalization',               2),
    (g1, 'correct',   'Pointed or gestured',                    3),
    (g1, 'incorrect', 'Grabbed without asking',                 1),
    (g1, 'incorrect', 'Made loud vocalization without words',   2),
    (g1, 'incorrect', 'Walked away without communicating',      3),
    (g2, 'correct',   'Used calm-down strategy independently',  1),
    (g2, 'correct',   'Accepted redirection',                   2),
    (g2, 'incorrect', 'Banged head',                            1),
    (g2, 'incorrect', 'Hit or kicked',                          2),
    (g2, 'incorrect', 'Elopement attempt',                      3);
END $$;
