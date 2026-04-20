import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============================================================
// GET — export all of the current user's data as JSON.
// Scoped by user_id everywhere (activities, schedules, goals,
// task library, categories, etc.) so users only see their own.
// ============================================================
export async function GET() {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const [
      activities,
      activity_defaults,
      activity_sub_activities,
      schedule_entries,
      schedule_entry_sub_activities,
      activity_usage_log,
      goals,
      goal_subcategories,
      goal_responses,
      app_settings,
      categories,
      task_library_categories,
      task_library_items,
    ] = await Promise.all([
      sql`SELECT * FROM activities WHERE user_id = ${userId}`,
      sql`SELECT ad.* FROM activity_defaults ad
          JOIN activities a ON ad.activity_id = a.id
          WHERE a.user_id = ${userId}`,
      sql`SELECT s.* FROM activity_sub_activities s
          JOIN activities a ON s.activity_id = a.id
          WHERE a.user_id = ${userId}`,
      sql`SELECT * FROM schedule_entries WHERE user_id = ${userId}`,
      sql`SELECT es.* FROM schedule_entry_sub_activities es
          JOIN schedule_entries se ON es.entry_id = se.id
          WHERE se.user_id = ${userId}`,
      sql`SELECT * FROM activity_usage_log WHERE user_id = ${userId}`,
      sql`SELECT * FROM goals WHERE user_id = ${userId}`,
      sql`SELECT gs.* FROM goal_subcategories gs
          JOIN goals g ON gs.goal_id = g.id
          WHERE g.user_id = ${userId}`,
      sql`SELECT * FROM goal_responses WHERE user_id = ${userId}`,
      sql`SELECT * FROM app_settings WHERE user_id = ${userId}`,
      // categories may or may not have user_id (legacy rows have NULL).
      // Include rows owned by this user plus any legacy NULL-owner rows
      // the user is still implicitly using.
      sql`SELECT * FROM categories WHERE user_id = ${userId} OR user_id IS NULL`,
      sql`SELECT * FROM task_library_categories WHERE user_id = ${userId}`,
      sql`SELECT * FROM task_library_items WHERE user_id = ${userId}`,
    ]);

    const data = {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      user_id: userId,
      activities,
      activity_defaults,
      activity_sub_activities,
      schedule_entries,
      schedule_entry_sub_activities,
      activity_usage_log,
      goals,
      goal_subcategories,
      goal_responses,
      app_settings,
      categories,
      task_library_categories,
      task_library_items,
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="horizons-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (e) {
    console.error('[export GET]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ============================================================
// POST — restore (or clear) the current user's data.
//
// CRITICAL: this ONLY touches rows owned by the caller. It
// never deletes or inserts data that belongs to other users.
//
// For the empty-body "Clear all data" flow, pass an object
// with version set and empty arrays for each collection.
// ============================================================
export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const data = await req.json();
    if (!data.version) {
      return NextResponse.json({ error: 'Invalid backup file — missing version field' }, { status: 400 });
    }

    await sql.begin(async sql => {
      // ----- Delete in FK-safe order, scoped to this user only -----
      // Child tables first (goal_responses, schedule_entry_sub_activities,
      // activity_sub_activities, goal_subcategories), then parents.
      await sql`DELETE FROM goal_responses WHERE user_id = ${userId}`;
      await sql`
        DELETE FROM schedule_entry_sub_activities
        WHERE entry_id IN (SELECT id FROM schedule_entries WHERE user_id = ${userId})
      `;
      await sql`
        DELETE FROM activity_sub_activities
        WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ${userId})
      `;
      await sql`
        DELETE FROM goal_subcategories
        WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ${userId})
      `;
      await sql`DELETE FROM goals WHERE user_id = ${userId}`;
      await sql`DELETE FROM schedule_entries WHERE user_id = ${userId}`;
      await sql`DELETE FROM activity_usage_log WHERE user_id = ${userId}`;
      await sql`
        DELETE FROM activity_defaults
        WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ${userId})
      `;
      await sql`DELETE FROM activities WHERE user_id = ${userId}`;
      await sql`DELETE FROM app_settings WHERE user_id = ${userId}`;
      await sql`DELETE FROM task_library_items WHERE user_id = ${userId}`;
      await sql`DELETE FROM task_library_categories WHERE user_id = ${userId}`;
      // categories: only delete rows owned by this user (leave shared/NULL-owner alone)
      await sql`DELETE FROM categories WHERE user_id = ${userId}`;

      // Map old activity IDs → new activity IDs so FK references survive
      // a restore even if the sequence has moved on or the data came from
      // a different environment.
      const activityIdMap = new Map<number, number>();
      const scheduleEntryIdMap = new Map<number, number>();
      const goalIdMap = new Map<number, number>();
      const subcategoryIdMap = new Map<number, number>();
      const activitySubIdMap = new Map<number, number>();

      // categories
      if (Array.isArray(data.categories)) {
        for (const r of data.categories) {
          await sql`
            INSERT INTO categories (user_id, name, color, sort_order)
            VALUES (${userId}, ${r.name}, ${r.color ?? '#6B7280'}, ${r.sort_order ?? 0})
            ON CONFLICT DO NOTHING
          `;
        }
      }

      // activities
      if (Array.isArray(data.activities)) {
        for (const r of data.activities) {
          const [row] = await sql`
            INSERT INTO activities (user_id, name, description, category, color, is_default, is_archived, created_at)
            VALUES (
              ${userId},
              ${r.name},
              ${r.description ?? null},
              ${r.category ?? null},
              ${r.color ?? '#F97316'},
              ${r.is_default ?? 0},
              ${r.is_archived ?? 0},
              ${r.created_at ?? new Date().toISOString()}
            )
            RETURNING id
          `;
          if (typeof r.id === 'number') activityIdMap.set(r.id, (row as { id: number }).id);
        }
      }

      // activity_defaults (includes days_of_week so M-Thu recurrence is preserved)
      if (Array.isArray(data.activity_defaults)) {
        for (const r of data.activity_defaults) {
          const newActId = activityIdMap.get(r.activity_id) ?? r.activity_id;
          await sql`
            INSERT INTO activity_defaults (activity_id, default_time, default_duration, days_of_week)
            VALUES (
              ${newActId},
              ${r.default_time},
              ${r.default_duration ?? 30},
              ${r.days_of_week ?? null}
            )
          `;
        }
      }

      // activity_sub_activities
      if (Array.isArray(data.activity_sub_activities)) {
        for (const r of data.activity_sub_activities) {
          const newActId = activityIdMap.get(r.activity_id) ?? r.activity_id;
          const [row] = await sql`
            INSERT INTO activity_sub_activities (activity_id, label, sort_order, is_active)
            VALUES (${newActId}, ${r.label}, ${r.sort_order ?? 0}, ${r.is_active ?? 1})
            RETURNING id
          `;
          if (typeof r.id === 'number') activitySubIdMap.set(r.id, (row as { id: number }).id);
        }
      }

      // schedule_entries
      if (Array.isArray(data.schedule_entries)) {
        for (const r of data.schedule_entries) {
          const newActId = r.activity_id != null
            ? (activityIdMap.get(r.activity_id) ?? null)
            : null;
          const [row] = await sql`
            INSERT INTO schedule_entries (user_id, activity_id, date, time_slot, duration_minutes, notes, is_completed, removed, created_at)
            VALUES (
              ${userId},
              ${newActId},
              ${r.date},
              ${r.time_slot},
              ${r.duration_minutes ?? 30},
              ${r.notes ?? null},
              ${r.is_completed ?? 0},
              ${r.removed ?? 0},
              ${r.created_at ?? new Date().toISOString()}
            )
            RETURNING id
          `;
          if (typeof r.id === 'number') scheduleEntryIdMap.set(r.id, (row as { id: number }).id);
        }
      }

      // schedule_entry_sub_activities
      if (Array.isArray(data.schedule_entry_sub_activities)) {
        for (const r of data.schedule_entry_sub_activities) {
          const newEntryId = scheduleEntryIdMap.get(r.entry_id);
          if (newEntryId == null) continue;
          const newSubId = r.sub_activity_id != null
            ? (activitySubIdMap.get(r.sub_activity_id) ?? null)
            : null;
          await sql`
            INSERT INTO schedule_entry_sub_activities (entry_id, sub_activity_id, label, completed)
            VALUES (${newEntryId}, ${newSubId}, ${r.label}, ${r.completed ?? 0})
          `;
        }
      }

      // activity_usage_log
      if (Array.isArray(data.activity_usage_log)) {
        for (const r of data.activity_usage_log) {
          const newActId = activityIdMap.get(r.activity_id) ?? r.activity_id;
          await sql`
            INSERT INTO activity_usage_log (user_id, activity_id, week_start, times_scheduled)
            VALUES (${userId}, ${newActId}, ${r.week_start}, ${r.times_scheduled ?? 0})
            ON CONFLICT (user_id, activity_id, week_start) DO UPDATE SET times_scheduled = EXCLUDED.times_scheduled
          `;
        }
      }

      // goals
      if (Array.isArray(data.goals)) {
        for (const r of data.goals) {
          const [row] = await sql`
            INSERT INTO goals (user_id, name, description, color, is_active, sort_order, created_at)
            VALUES (
              ${userId},
              ${r.name},
              ${r.description ?? null},
              ${r.color ?? '#0EA5E9'},
              ${r.is_active ?? 1},
              ${r.sort_order ?? 0},
              ${r.created_at ?? new Date().toISOString()}
            )
            RETURNING id
          `;
          if (typeof r.id === 'number') goalIdMap.set(r.id, (row as { id: number }).id);
        }
      }

      // goal_subcategories
      if (Array.isArray(data.goal_subcategories)) {
        for (const r of data.goal_subcategories) {
          const newGoalId = goalIdMap.get(r.goal_id);
          if (newGoalId == null) continue;
          const [row] = await sql`
            INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order, is_active)
            VALUES (${newGoalId}, ${r.response_type}, ${r.label}, ${r.sort_order ?? 0}, ${r.is_active ?? 1})
            RETURNING id
          `;
          if (typeof r.id === 'number') subcategoryIdMap.set(r.id, (row as { id: number }).id);
        }
      }

      // goal_responses
      if (Array.isArray(data.goal_responses)) {
        for (const r of data.goal_responses) {
          const newGoalId = goalIdMap.get(r.goal_id);
          if (newGoalId == null) continue;
          const newSubId = r.subcategory_id != null
            ? (subcategoryIdMap.get(r.subcategory_id) ?? null)
            : null;
          await sql`
            INSERT INTO goal_responses (user_id, goal_id, subcategory_id, response_type, date, timestamp, session_notes)
            VALUES (
              ${userId},
              ${newGoalId},
              ${newSubId},
              ${r.response_type},
              ${r.date},
              ${r.timestamp ?? new Date().toISOString()},
              ${r.session_notes ?? null}
            )
          `;
        }
      }

      // app_settings
      if (Array.isArray(data.app_settings)) {
        for (const r of data.app_settings) {
          await sql`
            INSERT INTO app_settings (user_id, key, value)
            VALUES (${userId}, ${r.key}, ${String(r.value)})
            ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value
          `;
        }
      }

      // task_library_categories & items
      const taskCatIdMap = new Map<number, number>();
      if (Array.isArray(data.task_library_categories)) {
        for (const r of data.task_library_categories) {
          const [row] = await sql`
            INSERT INTO task_library_categories (user_id, name, sort_order)
            VALUES (${userId}, ${r.name}, ${r.sort_order ?? 0})
            RETURNING id
          `;
          if (typeof r.id === 'number') taskCatIdMap.set(r.id, (row as { id: number }).id);
        }
      }
      if (Array.isArray(data.task_library_items)) {
        for (const r of data.task_library_items) {
          const newCatId = taskCatIdMap.get(r.category_id);
          if (newCatId == null) continue;
          await sql`
            INSERT INTO task_library_items (user_id, category_id, label, sort_order)
            VALUES (${userId}, ${newCatId}, ${r.label}, ${r.sort_order ?? 0})
          `;
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[export POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
