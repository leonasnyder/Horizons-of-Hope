import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const data = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      activities: db.prepare('SELECT * FROM activities').all(),
      activity_defaults: db.prepare('SELECT * FROM activity_defaults').all(),
      schedule_entries: db.prepare('SELECT * FROM schedule_entries').all(),
      activity_usage_log: db.prepare('SELECT * FROM activity_usage_log').all(),
      goals: db.prepare('SELECT * FROM goals').all(),
      goal_subcategories: db.prepare('SELECT * FROM goal_subcategories').all(),
      goal_responses: db.prepare('SELECT * FROM goal_responses').all(),
      app_settings: db.prepare('SELECT * FROM app_settings').all(),
    };
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="horizons-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const data = await req.json();
    if (!data.version) return NextResponse.json({ error: 'Invalid backup file — missing version field' }, { status: 400 });

    db.transaction(() => {
      // Clear all tables in dependency order (individual statements, not db.exec)
      db.prepare('DELETE FROM goal_responses').run();
      db.prepare('DELETE FROM goal_subcategories').run();
      db.prepare('DELETE FROM goals').run();
      db.prepare('DELETE FROM schedule_entries').run();
      db.prepare('DELETE FROM activity_usage_log').run();
      db.prepare('DELETE FROM activity_defaults').run();
      db.prepare('DELETE FROM activities').run();
      db.prepare('DELETE FROM app_settings').run();

      if (Array.isArray(data.activities)) {
        const stmt = db.prepare('INSERT INTO activities (id, name, description, category, color, is_default, is_archived, created_at) VALUES (?,?,?,?,?,?,?,?)');
        for (const r of data.activities) stmt.run(r.id, r.name, r.description, r.category, r.color, r.is_default, r.is_archived, r.created_at);
      }
      if (Array.isArray(data.activity_defaults)) {
        const stmt = db.prepare('INSERT INTO activity_defaults (id, activity_id, default_time, default_duration) VALUES (?,?,?,?)');
        for (const r of data.activity_defaults) stmt.run(r.id, r.activity_id, r.default_time, r.default_duration);
      }
      if (Array.isArray(data.schedule_entries)) {
        const stmt = db.prepare('INSERT INTO schedule_entries (id, activity_id, date, time_slot, duration_minutes, notes, is_completed, removed, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
        for (const r of data.schedule_entries) stmt.run(r.id, r.activity_id, r.date, r.time_slot, r.duration_minutes, r.notes, r.is_completed, r.removed, r.created_at);
      }
      if (Array.isArray(data.activity_usage_log)) {
        const stmt = db.prepare('INSERT INTO activity_usage_log (id, activity_id, week_start, times_scheduled) VALUES (?,?,?,?)');
        for (const r of data.activity_usage_log) stmt.run(r.id, r.activity_id, r.week_start, r.times_scheduled);
      }
      if (Array.isArray(data.goals)) {
        const stmt = db.prepare('INSERT INTO goals (id, name, description, color, is_active, sort_order, created_at) VALUES (?,?,?,?,?,?,?)');
        for (const r of data.goals) stmt.run(r.id, r.name, r.description, r.color, r.is_active, r.sort_order, r.created_at);
      }
      if (Array.isArray(data.goal_subcategories)) {
        const stmt = db.prepare('INSERT INTO goal_subcategories (id, goal_id, response_type, label, sort_order, is_active) VALUES (?,?,?,?,?,?)');
        for (const r of data.goal_subcategories) stmt.run(r.id, r.goal_id, r.response_type, r.label, r.sort_order, r.is_active);
      }
      if (Array.isArray(data.goal_responses)) {
        const stmt = db.prepare('INSERT INTO goal_responses (id, goal_id, subcategory_id, response_type, date, timestamp, session_notes) VALUES (?,?,?,?,?,?,?)');
        for (const r of data.goal_responses) stmt.run(r.id, r.goal_id, r.subcategory_id, r.response_type, r.date, r.timestamp, r.session_notes);
      }
      if (Array.isArray(data.app_settings)) {
        const stmt = db.prepare('INSERT INTO app_settings (key, value) VALUES (?,?)');
        for (const r of data.app_settings) stmt.run(r.key, r.value);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
