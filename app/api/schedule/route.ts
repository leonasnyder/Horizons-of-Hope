import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getWeekStart } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function attachSubActivities(db: ReturnType<typeof getDb>, entries: object[]): object[] {
  if (entries.length === 0) return entries;
  const ids = (entries as { id: number }[]).map(e => e.id);
  const byEntry: Record<number, object[]> = {};
  for (const id of ids) {
    const subs = db.prepare(
      'SELECT * FROM schedule_entry_sub_activities WHERE entry_id = ? ORDER BY id'
    ).all(id) as { entry_id: number }[];
    for (const s of subs) (byEntry[s.entry_id] ??= []).push(s);
  }
  return (entries as { id: number }[]).map(e => ({ ...e, entry_sub_activities: byEntry[e.id] ?? [] }));
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let entries;
    if (date) {
      // Auto-populate if no non-removed entries exist for this date
      const existing = db.prepare(
        `SELECT COUNT(*) as c FROM schedule_entries WHERE date = ? AND removed = 0`
      ).get(date) as { c: number };

      if (existing.c === 0) {
        const defaults = db.prepare(`
          SELECT a.id as activity_id, ad.default_time, ad.default_duration
          FROM activities a
          JOIN activity_defaults ad ON a.id = ad.activity_id
          WHERE a.is_default = 1 AND a.is_archived = 0
          ORDER BY ad.default_time
        `).all() as Array<{ activity_id: number; default_time: string; default_duration: number }>;

        if (defaults.length > 0) {
          const insert = db.prepare(
            `INSERT INTO schedule_entries (activity_id, date, time_slot, duration_minutes) VALUES (?, ?, ?, ?)`
          );
          const weekStart = getWeekStart(new Date(date + 'T12:00:00'));
          const upsertUsage = db.prepare(`
            INSERT INTO activity_usage_log (activity_id, week_start, times_scheduled)
            VALUES (?, ?, 1)
            ON CONFLICT(activity_id, week_start) DO UPDATE SET times_scheduled = times_scheduled + 1
          `);
          const insertAll = db.transaction(() => {
            for (const d of defaults) {
              insert.run(d.activity_id, date, d.default_time, d.default_duration);
              upsertUsage.run(d.activity_id, weekStart);
            }
          });
          insertAll();
        }
      }

      entries = db.prepare(`
        SELECT se.*, a.name as activity_name, a.category, a.color
        FROM schedule_entries se
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE se.date = ? AND se.removed = 0
        ORDER BY se.time_slot
      `).all(date);
    } else if (startDate && endDate) {
      entries = db.prepare(`
        SELECT se.*, a.name as activity_name, a.category, a.color
        FROM schedule_entries se
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE se.date >= ? AND se.date <= ? AND se.removed = 0
        ORDER BY se.date, se.time_slot
      `).all(startDate, endDate);
    } else {
      return NextResponse.json({ error: 'date or startDate+endDate required' }, { status: 400 });
    }

    return NextResponse.json(attachSubActivities(db, entries as object[]));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { activity_id, date, time_slot, duration_minutes, notes, sub_activity_ids } = body;
    if (!date || !time_slot) return NextResponse.json({ error: 'date and time_slot required' }, { status: 400 });

    const result = db.prepare(
      `INSERT INTO schedule_entries (activity_id, date, time_slot, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)`
    ).run(activity_id ?? null, date, time_slot, duration_minutes ?? 30, notes ?? null);

    if (activity_id) {
      const weekStart = getWeekStart(new Date(date + 'T12:00:00'));
      db.prepare(`
        INSERT INTO activity_usage_log (activity_id, week_start, times_scheduled)
        VALUES (?, ?, 1)
        ON CONFLICT(activity_id, week_start) DO UPDATE SET times_scheduled = times_scheduled + 1
      `).run(activity_id, weekStart);
    }

    if (Array.isArray(sub_activity_ids) && sub_activity_ids.length > 0) {
      const entryId = Number(result.lastInsertRowid);
      const getLabel = db.prepare('SELECT label FROM activity_sub_activities WHERE id = ? AND is_active = 1');
      const insertSub = db.prepare('INSERT INTO schedule_entry_sub_activities (entry_id, sub_activity_id, label, completed) VALUES (?, ?, ?, 0)');
      const insertSubs = db.transaction(() => {
        for (const subId of sub_activity_ids as number[]) {
          const row = getLabel.get(subId) as { label: string } | undefined;
          if (row) insertSub.run(entryId, subId, row.label);
        }
      });
      insertSubs();
    }

    const entry = db.prepare('SELECT * FROM schedule_entries WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
