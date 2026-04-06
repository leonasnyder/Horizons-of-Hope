import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'horizons.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      color TEXT DEFAULT '#F97316',
      is_default INTEGER DEFAULT 1,
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_defaults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id),
      default_time TEXT NOT NULL,
      default_duration INTEGER DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS schedule_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER REFERENCES activities(id),
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      notes TEXT,
      is_completed INTEGER DEFAULT 0,
      removed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER REFERENCES activities(id),
      week_start TEXT NOT NULL,
      times_scheduled INTEGER DEFAULT 0,
      UNIQUE(activity_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#0EA5E9',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goal_subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER REFERENCES goals(id),
      response_type TEXT NOT NULL CHECK(response_type IN ('correct','incorrect')),
      label TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS goal_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER REFERENCES goals(id),
      subcategory_id INTEGER REFERENCES goal_subcategories(id),
      response_type TEXT NOT NULL CHECK(response_type IN ('correct','incorrect')),
      date TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      session_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  seedIfEmpty(db);
}

function seedIfEmpty(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM activities').get() as { c: number }).c;
  if (count > 0) return;

  const insertActivity = db.prepare(
    `INSERT INTO activities (name, description, category, is_default) VALUES (?, ?, ?, ?)`
  );
  const insertDefault = db.prepare(
    `INSERT INTO activity_defaults (activity_id, default_time, default_duration) VALUES (?, ?, ?)`
  );
  const insertGoal = db.prepare(
    `INSERT INTO goals (name, description, color) VALUES (?, ?, ?)`
  );
  const insertSubcat = db.prepare(
    `INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order) VALUES (?, ?, ?, ?)`
  );

  const activities: [string, string, string, number][] = [
    ['Morning greeting', 'Group hello circle, name recognition', 'Social', 1],
    ['Ball toss', 'Gross motor skills, catching and throwing', 'Motor Skills', 1],
    ['AAC device practice', 'Core vocabulary navigation on device', 'Communication', 1],
    ['Snack time', 'Self-feeding, utensil use, requesting', 'Life Skills', 1],
    ['Puzzle activity', 'Fine motor, shape recognition', 'Academic', 1],
    ['Music and movement', 'Rhythm, following directions, body awareness', 'Social', 1],
    ['Handwashing routine', 'Step-by-step independence practice', 'Life Skills', 1],
    ['Matching game', 'Visual discrimination, turn taking', 'Academic', 1],
    ['Outdoor walk', 'Gross motor, sensory input, community navigation', 'Motor Skills', 0],
    ['Read-aloud', 'Listening comprehension, vocabulary', 'Academic', 0],
    ['Art project', 'Fine motor, creativity, following instructions', 'Motor Skills', 0],
    ['Cooking/baking', 'Sequencing, math concepts, life skills', 'Life Skills', 0],
  ];

  const defaultTimes: [string, number][] = [
    ['08:00', 30], ['09:00', 30], ['09:30', 30], ['10:00', 30],
    ['10:30', 30], ['11:00', 30], ['11:30', 15], ['13:00', 30],
  ];

  const seedAll = db.transaction(() => {
    const insertedIds: number[] = [];
    for (const act of activities) {
      const result = insertActivity.run(...act) as Database.RunResult;
      insertedIds.push(Number(result.lastInsertRowid));
    }
    defaultTimes.forEach(([time, dur], i) => {
      insertDefault.run(insertedIds[i], time, dur);
    });

    const g1 = (insertGoal.run('Communication goal', 'Track use of AAC device and verbal attempts', '#0EA5E9') as Database.RunResult).lastInsertRowid;
    const g2 = (insertGoal.run('Behavior regulation', 'Track self-regulation responses', '#22C55E') as Database.RunResult).lastInsertRowid;

    const subcats: [bigint | number, string, string, number][] = [
      [g1, 'correct', 'Used AAC device', 1],
      [g1, 'correct', 'Used clear verbalization', 2],
      [g1, 'correct', 'Pointed or gestured', 3],
      [g1, 'incorrect', 'Grabbed without asking', 1],
      [g1, 'incorrect', 'Made loud vocalization without words', 2],
      [g1, 'incorrect', 'Walked away without communicating', 3],
      [g2, 'correct', 'Used calm-down strategy independently', 1],
      [g2, 'correct', 'Accepted redirection', 2],
      [g2, 'incorrect', 'Banged head', 1],
      [g2, 'incorrect', 'Hit or kicked', 2],
      [g2, 'incorrect', 'Elopement attempt', 3],
    ];
    for (const s of subcats) insertSubcat.run(...s);
  });
  seedAll();
}

// Typed exports
export interface Activity {
  id: number; name: string; description: string | null;
  category: string | null; color: string; is_default: number;
  is_archived: number; created_at: string;
}

export interface ActivityDefault {
  id: number; activity_id: number; default_time: string; default_duration: number;
}

export interface ScheduleEntry {
  id: number; activity_id: number | null; date: string; time_slot: string;
  duration_minutes: number; notes: string | null; is_completed: number;
  removed: number; created_at: string;
}

export interface Goal {
  id: number; name: string; description: string | null; color: string;
  is_active: number; sort_order: number; created_at: string;
}

export interface GoalSubcategory {
  id: number; goal_id: number;
  response_type: 'correct' | 'incorrect'; label: string;
  sort_order: number; is_active: number;
}

export interface GoalResponse {
  id: number; goal_id: number; subcategory_id: number | null;
  response_type: 'correct' | 'incorrect'; date: string;
  timestamp: string; session_notes: string | null;
}

export interface AppSetting { key: string; value: string | null; }
