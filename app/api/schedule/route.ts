import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getWeekStart } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function attachSubActivities(entries: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  if (entries.length === 0) return entries;
  const ids = entries.map(e => e.id as number);
  const subs = await sql`
    SELECT * FROM schedule_entry_sub_activities WHERE entry_id = ANY(${ids}) ORDER BY id
  `;
  const byEntry: Record<number, unknown[]> = {};
  for (const s of subs as unknown as Array<{ entry_id: number }>) {
    (byEntry[s.entry_id] ??= []).push(s);
  }
  return entries.map(e => ({ ...e, entry_sub_activities: byEntry[e.id as number] ?? [] }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let entries: Record<string, unknown>[];

    if (date) {
      const countResult = await sql`
        SELECT COUNT(*) as c FROM schedule_entries WHERE date = ${date} AND removed = 0
      `;
      if (Number(countResult[0].c) === 0) {
        const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const allDefaults = await sql`
          SELECT a.id as activity_id, ad.default_time, ad.default_duration, ad.days_of_week
          FROM activities a
          JOIN activity_defaults ad ON a.id = ad.activity_id
          WHERE a.is_default = 1 AND a.is_archived = 0
          ORDER BY ad.default_time
        `;
        const defaults = (allDefaults as unknown as Array<{ activity_id: number; default_time: string; default_duration: number; days_of_week: string | null }>).filter(d => {
          if (!d.days_of_week) return true;
          return d.days_of_week.split(',').map(Number).includes(dayOfWeek);
        });
        if (defaults.length > 0) {
          const weekStart = getWeekStart(new Date(date + 'T12:00:00'));
          await sql.begin(async sql => {
            for (const d of defaults) {
              await sql`
                INSERT INTO schedule_entries (activity_id, date, time_slot, duration_minutes)
                VALUES (${d.activity_id}, ${date}, ${d.default_time}, ${d.default_duration})
              `;
              await sql`
                INSERT INTO activity_usage_log (activity_id, week_start, times_scheduled)
                VALUES (${d.activity_id}, ${weekStart}, 1)
                ON CONFLICT(activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
              `;
            }
          });
        }
      }

      entries = await sql`
        SELECT se.*, a.name as activity_name, a.category, a.color
        FROM schedule_entries se
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE se.date = ${date} AND se.removed = 0
        ORDER BY se.time_slot
      ` as Record<string, unknown>[];
    } else if (startDate && endDate) {
      // Find which dates in the range already have entries
      const existing = await sql`
        SELECT DISTINCT date FROM schedule_entries
        WHERE date >= ${startDate} AND date <= ${endDate} AND removed = 0
      `;
      const existingDates = new Set((existing as unknown as Array<{ date: string | Date }>).map(r =>
        typeof r.date === 'string' ? r.date : r.date.toISOString().split('T')[0]
      ));

      // Fetch all defaults once
      const allDefaults = await sql`
        SELECT a.id as activity_id, ad.default_time, ad.default_duration, ad.days_of_week
        FROM activities a
        JOIN activity_defaults ad ON a.id = ad.activity_id
        WHERE a.is_default = 1 AND a.is_archived = 0
        ORDER BY ad.default_time
      ` as unknown as Array<{ activity_id: number; default_time: string; default_duration: number; days_of_week: string | null }>;

      // Auto-populate each date in range that has no entries
      if (allDefaults.length > 0) {
        const datesToPopulate: string[] = [];
        const cur = new Date(startDate + 'T12:00:00');
        const end = new Date(endDate + 'T12:00:00');
        while (cur <= end) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          if (!existingDates.has(dateStr)) datesToPopulate.push(dateStr);
          cur.setDate(cur.getDate() + 1);
        }

        if (datesToPopulate.length > 0) {
          await sql.begin(async sql => {
            for (const dateStr of datesToPopulate) {
              const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
              const dayDefaults = allDefaults.filter(d =>
                !d.days_of_week || d.days_of_week.split(',').map(Number).includes(dayOfWeek)
              );
              if (dayDefaults.length === 0) continue;
              const weekStart = getWeekStart(new Date(dateStr + 'T12:00:00'));
              for (const d of dayDefaults) {
                await sql`
                  INSERT INTO schedule_entries (activity_id, date, time_slot, duration_minutes)
                  VALUES (${d.activity_id}, ${dateStr}, ${d.default_time}, ${d.default_duration})
                `;
                await sql`
                  INSERT INTO activity_usage_log (activity_id, week_start, times_scheduled)
                  VALUES (${d.activity_id}, ${weekStart}, 1)
                  ON CONFLICT(activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
                `;
              }
            }
          });
        }
      }

      entries = await sql`
        SELECT se.*, a.name as activity_name, a.category, a.color
        FROM schedule_entries se
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE se.date >= ${startDate} AND se.date <= ${endDate} AND se.removed = 0
        ORDER BY se.date, se.time_slot
      ` as Record<string, unknown>[];
    } else {
      return NextResponse.json({ error: 'date or startDate+endDate required' }, { status: 400 });
    }

    return NextResponse.json(await attachSubActivities(entries));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { activity_id, date, time_slot, duration_minutes, notes, sub_activity_ids } = body;
    if (!date || !time_slot) return NextResponse.json({ error: 'date and time_slot required' }, { status: 400 });

    const [entry] = await sql`
      INSERT INTO schedule_entries (activity_id, date, time_slot, duration_minutes, notes)
      VALUES (${activity_id ?? null}, ${date}, ${time_slot}, ${duration_minutes ?? 30}, ${notes ?? null})
      RETURNING *
    `;

    if (activity_id) {
      const weekStart = getWeekStart(new Date(date + 'T12:00:00'));
      await sql`
        INSERT INTO activity_usage_log (activity_id, week_start, times_scheduled)
        VALUES (${activity_id}, ${weekStart}, 1)
        ON CONFLICT(activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
      `;
    }

    if (Array.isArray(sub_activity_ids) && sub_activity_ids.length > 0) {
      const entryId = entry.id as number;
      await sql.begin(async sql => {
        for (const subId of sub_activity_ids as number[]) {
          const labels = await sql`SELECT label FROM activity_sub_activities WHERE id = ${subId} AND is_active = 1`;
          if (labels.length > 0) {
            await sql`
              INSERT INTO schedule_entry_sub_activities (entry_id, sub_activity_id, label, completed)
              VALUES (${entryId}, ${subId}, ${(labels[0] as { label: string }).label}, 0)
            `;
          }
        }
      });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
