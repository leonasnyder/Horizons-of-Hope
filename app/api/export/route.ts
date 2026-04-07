import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      activities: await sql`SELECT * FROM activities`,
      activity_defaults: await sql`SELECT * FROM activity_defaults`,
      schedule_entries: await sql`SELECT * FROM schedule_entries`,
      activity_usage_log: await sql`SELECT * FROM activity_usage_log`,
      goals: await sql`SELECT * FROM goals`,
      goal_subcategories: await sql`SELECT * FROM goal_subcategories`,
      goal_responses: await sql`SELECT * FROM goal_responses`,
      app_settings: await sql`SELECT * FROM app_settings`,
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
    const data = await req.json();
    if (!data.version) return NextResponse.json({ error: 'Invalid backup file — missing version field' }, { status: 400 });

    await sql.begin(async sql => {
      await sql`DELETE FROM goal_responses`;
      await sql`DELETE FROM schedule_entry_sub_activities`;
      await sql`DELETE FROM activity_sub_activities`;
      await sql`DELETE FROM goal_subcategories`;
      await sql`DELETE FROM goals`;
      await sql`DELETE FROM schedule_entries`;
      await sql`DELETE FROM activity_usage_log`;
      await sql`DELETE FROM activity_defaults`;
      await sql`DELETE FROM activities`;
      await sql`DELETE FROM app_settings`;

      if (Array.isArray(data.activities)) {
        for (const r of data.activities) {
          await sql`INSERT INTO activities (id, name, description, category, color, is_default, is_archived, created_at)
            VALUES (${r.id}, ${r.name}, ${r.description}, ${r.category}, ${r.color}, ${r.is_default}, ${r.is_archived}, ${r.created_at})`;
        }
      }
      if (Array.isArray(data.activity_defaults)) {
        for (const r of data.activity_defaults) {
          await sql`INSERT INTO activity_defaults (id, activity_id, default_time, default_duration)
            VALUES (${r.id}, ${r.activity_id}, ${r.default_time}, ${r.default_duration})`;
        }
      }
      if (Array.isArray(data.schedule_entries)) {
        for (const r of data.schedule_entries) {
          await sql`INSERT INTO schedule_entries (id, activity_id, date, time_slot, duration_minutes, notes, is_completed, removed, created_at)
            VALUES (${r.id}, ${r.activity_id}, ${r.date}, ${r.time_slot}, ${r.duration_minutes}, ${r.notes}, ${r.is_completed}, ${r.removed}, ${r.created_at})`;
        }
      }
      if (Array.isArray(data.activity_usage_log)) {
        for (const r of data.activity_usage_log) {
          await sql`INSERT INTO activity_usage_log (id, activity_id, week_start, times_scheduled)
            VALUES (${r.id}, ${r.activity_id}, ${r.week_start}, ${r.times_scheduled})`;
        }
      }
      if (Array.isArray(data.goals)) {
        for (const r of data.goals) {
          await sql`INSERT INTO goals (id, name, description, color, is_active, sort_order, created_at)
            VALUES (${r.id}, ${r.name}, ${r.description}, ${r.color}, ${r.is_active}, ${r.sort_order}, ${r.created_at})`;
        }
      }
      if (Array.isArray(data.goal_subcategories)) {
        for (const r of data.goal_subcategories) {
          await sql`INSERT INTO goal_subcategories (id, goal_id, response_type, label, sort_order, is_active)
            VALUES (${r.id}, ${r.goal_id}, ${r.response_type}, ${r.label}, ${r.sort_order}, ${r.is_active})`;
        }
      }
      if (Array.isArray(data.goal_responses)) {
        for (const r of data.goal_responses) {
          await sql`INSERT INTO goal_responses (id, goal_id, subcategory_id, response_type, date, timestamp, session_notes)
            VALUES (${r.id}, ${r.goal_id}, ${r.subcategory_id}, ${r.response_type}, ${r.date}, ${r.timestamp}, ${r.session_notes})`;
        }
      }
      if (Array.isArray(data.app_settings)) {
        for (const r of data.app_settings) {
          await sql`INSERT INTO app_settings (key, value) VALUES (${r.key}, ${r.value})`;
        }
      }

      // Reset sequences so new inserts don't collide with restored IDs
      for (const table of ['activities', 'activity_defaults', 'schedule_entries', 'activity_usage_log', 'goals', 'goal_subcategories', 'goal_responses', 'activity_sub_activities', 'schedule_entry_sub_activities']) {
        await sql`SELECT setval(pg_get_serial_sequence(${table}, 'id'), COALESCE((SELECT MAX(id) FROM ${sql(table)}), 0))`;
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
