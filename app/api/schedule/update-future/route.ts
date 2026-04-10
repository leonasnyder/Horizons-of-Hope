import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Update all future schedule entries for an activity from a given date onward
export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const { activity_id, from_date, time_slot, duration_minutes, removed_days } = await req.json();
    if (!activity_id || !from_date) {
      return NextResponse.json({ error: 'activity_id and from_date are required' }, { status: 400 });
    }

    const hasTimeDurationUpdate = time_slot || duration_minutes != null;
    const hasRemovedDays = Array.isArray(removed_days) && removed_days.length > 0;

    if (!hasTimeDurationUpdate && !hasRemovedDays) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    let updated = 0;

    // Update time/duration on all future entries for this activity
    if (hasTimeDurationUpdate) {
      const result = await sql`
        UPDATE schedule_entries
        SET
          time_slot = COALESCE(${time_slot ?? null}, time_slot),
          duration_minutes = COALESCE(${duration_minutes ?? null}, duration_minutes)
        WHERE activity_id = ${activity_id}
          AND user_id = ${userId}
          AND date >= ${from_date}
          AND removed = 0
      `;
      updated += result.count;
    }

    // Soft-delete future entries on days that were removed from the schedule
    if (hasRemovedDays) {
      const result = await sql`
        UPDATE schedule_entries
        SET removed = 1
        WHERE activity_id = ${activity_id}
          AND user_id = ${userId}
          AND date >= ${from_date}
          AND removed = 0
          AND EXTRACT(DOW FROM date::date) = ANY(${removed_days}::int[])
      `;
      updated += result.count;
    }

    // Also update the activity's default time/duration so future auto-scheduled entries are correct
    if (time_slot) {
      await sql`
        UPDATE activity_defaults SET default_time = ${time_slot}
        WHERE activity_id = ${activity_id}
      `;
    }
    if (duration_minutes != null) {
      await sql`
        UPDATE activity_defaults SET default_duration = ${duration_minutes}
        WHERE activity_id = ${activity_id}
      `;
    }

    return NextResponse.json({ success: true, updated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
