import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getWeekStart } from '@/lib/utils';
import { requireUser } from '@/lib/auth';

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
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let entries: Record<string, unknown>[];

    if (date) {
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const allDefaults = await sql`
        SELECT a.id as activity_id, ad.default_time, ad.default_duration, ad.days_of_week
        FROM activities a
        JOIN activity_defaults ad ON a.id = ad.activity_id
        WHERE a.is_default = 1 AND a.is_archived = 0 AND a.user_id = ${userId}
        ORDER BY ad.default_time
      `;
      const defaults = (allDefaults as unknown as Array<{ activity_id: number; default_time: string; default_duration: number; days_of_week: string | null }>).filter(d => {
        if (!d.days_of_week) return true;
        return d.days_of_week.split(',').map(Number).includes(dayOfWeek);
      });
      if (defaults.length > 0) {
        const existingActivityIds = await sql`
          SELECT activity_id FROM schedule_entries
          WHERE date = ${date} AND user_id = ${userId} AND activity_id IS NOT NULL
        `;
        const scheduledIds = new Set((existingActivityIds as unknown as Array<{ activity_id: number }>).map(r => r.activity_id));
        const missing = defaults.filter(d => !scheduledIds.has(d.activity_id));
        if (missing.length > 0) {
          const weekStart = getWeekStart(new Date(date + 'T12:00:00'));
          await sql.begin(async sql => {
            for (const d of missing) {
              await sql`
                INSERT INTO schedule_entries (user_id, activity_id, date, time_slot, duration_minutes)
                VALUES (${userId}, ${d.activity_id}, ${date}, ${d.default_time}, ${d.default_duration})
              `;
              await sql`
                INSERT INTO activity_usage_log (user_id, activity_id, week_start, times_scheduled)
                VALUES (${userId}, ${d.activity_id}, ${weekStart}, 1)
                ON CONFLICT(user_id, activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
              `;
            }
          });
        }
      }

      entries = await sql`
        SELECT se.*, a.name as activity_name, a.category, a.color
        FROM schedule_entries se
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE se.date = ${date} AND se.removed = 0 AND se.user_id = ${userId}
        ORDER BY se.time_slot
      ` as Record<string, unknown>[];
    } else if (startDate && endDate) {
      const allDefaults = await sql`
        SELECT a.id as activity_id, ad.default_time, ad.default_duration, ad.days_of_week
        FROM activities a
        JOIN activity_defaults ad ON a.id = ad.activity_id
        WHERE a.is_default = 1 AND a.is_archived = 0 AND a.user_id = ${userId}
        ORDER BY ad.default_time
      ` as unknown as Array<{ activity_id: number; default_time: string; default_duration: number; days_of_week: string | null }>;

      if (allDefaults.length > 0) {
        const existingEntries = await sql`
          SELECT date, activity_id FROM schedule_entries
          WHERE date >= ${startDate} AND date <= ${endDate} AND user_id = ${userId} AND activity_id IS NOT NULL
        ` as unknown as Array<{ date: string | Date; activity_id: number }>;
        const scheduledSet = new Set(existingEntries.map(r => {
          const d = typeof r.date === 'string' ? r.date : r.date.toISOString().split('T')[0];
          return `${d}:${r.activity_id}`;
        }));

        const cur = new Date(startDate + 'T12:00:00');
        const end = new Date(endDate + 'T12:00:00');
        await sql.begin(async sql => {
          while (cur <= end) {
            const y = cur.getFullYear();
            const mo = String(cur.getMonth() + 1).padStart(2, '0');
            const dy = String(cur.getDate()).padStart(2, '0');
            const dateStr = `${y}-${mo}-${dy}`;
            const dayOfWeek = cur.getDay();
            const dayDefaults = allDefaults.filter(d =>
              !d.days_of_week || d.days_of_week.split(',').map(Number).includes(dayOfWeek)
            );
            const missing = dayDefaults.filter(d => !scheduledSet.has(`${dateStr}:${d.activity_id}`));
            if (missing.length > 0) {
              const weekStart = getWeekStart(new Date(dateStr + 'T12:00:00'));
              for (const d of missing) {
                await sql`
                  INSERT INTO schedule_entries (user_id, activity_id, date, time_slot, duration_minutes)
                  VALUES (${userId}, ${d.activity_id}, ${dateStr}, ${d.default_time}, ${d.default_duration})
                `;
                await sql`
                  INSERT INTO activity_usage_log (user_id, activity_id, week_start, times_scheduled)
                  VALUES (${userId}, ${d.activity_id}, ${weekStart}, 1)
                  ON CONFLICT(user_id, activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
                `;
              }
            }
            cur.setDate(cur.getDate() + 1);
          }
        });
      }

      entries = await sql`
        SELECT se.*, a.name as activity_name, a.category, a.color
        FROM schedule_entries se
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE se.date >= ${startDate} AND se.date <= ${endDate} AND se.removed = 0 AND se.user_id = ${userId}
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

export async function DELETE(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
    await sql.begin(async sql => {
      await sql`
        DELETE FROM schedule_entry_sub_activities
        WHERE entry_id IN (SELECT id FROM schedule_entries WHERE date = ${date} AND user_id = ${userId})
      `;
      await sql`DELETE FROM schedule_entries WHERE date = ${date} AND user_id = ${userId}`;
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const { activity_id, date, time_slot, duration_minutes, notes, sub_activity_ids, custom_sub_labels } = body;
    if (!date || !time_slot) return NextResponse.json({ error: 'date and time_slot required' }, { status: 400 });

    const [entry] = await sql`
      INSERT INTO schedule_entries (user_id, activity_id, date, time_slot, duration_minutes, notes)
      VALUES (${userId}, ${activity_id ?? null}, ${date}, ${time_slot}, ${duration_minutes ?? 30}, ${notes ?? null})
      RETURNING *
    `;

    if (activity_id) {
      const weekStart = getWeekStart(new Date(date + 'T12:00:00'));
      await sql`
        INSERT INTO activity_usage_log (user_id, activity_id, week_start, times_scheduled)
        VALUES (${userId}, ${activity_id}, ${weekStart}, 1)
        ON CONFLICT(user_id, activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
      `;
    }

    await sql.begin(async sql => {
      const entryId = entry.id as number;
      if (Array.isArray(sub_activity_ids) && sub_activity_ids.length > 0) {
        for (const subId of sub_activity_ids as number[]) {
          const labels = await sql`SELECT label FROM activity_sub_activities WHERE id = ${subId} AND is_active = 1`;
          if (labels.length > 0) {
            await sql`
              INSERT INTO schedule_entry_sub_activities (entry_id, sub_activity_id, label, completed)
              VALUES (${entryId}, ${subId}, ${(labels[0] as { label: string }).label}, 0)
            `;
          }
        }
      }
      if (Array.isArray(custom_sub_labels)) {
        for (const label of custom_sub_labels as string[]) {
          if (typeof label === 'string' && label.trim()) {
            await sql`
              INSERT INTO schedule_entry_sub_activities (entry_id, sub_activity_id, label, completed)
              VALUES (${entryId}, null, ${label.trim()}, 0)
            `;
          }
        }
      }
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
