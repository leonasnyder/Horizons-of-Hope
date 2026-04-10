import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// Replace all sub-activities for an entry with the given sub_activity_ids and custom_labels
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const entryId = Number(params.id);
    const { sub_activity_ids, custom_labels } = await req.json();
    if (!Array.isArray(sub_activity_ids)) {
      return NextResponse.json({ error: 'sub_activity_ids must be an array' }, { status: 400 });
    }
    await sql.begin(async sql => {
      await sql`DELETE FROM schedule_entry_sub_activities WHERE entry_id = ${entryId}`;
      for (const subId of sub_activity_ids as number[]) {
        const labels = await sql`SELECT label FROM activity_sub_activities WHERE id = ${subId} AND is_active = 1`;
        if (labels.length > 0) {
          await sql`
            INSERT INTO schedule_entry_sub_activities (entry_id, sub_activity_id, label, completed)
            VALUES (${entryId}, ${subId}, ${(labels[0] as { label: string }).label}, 0)
          `;
        }
      }
      for (const label of (custom_labels ?? []) as string[]) {
        if (label.trim()) {
          await sql`
            INSERT INTO schedule_entry_sub_activities (entry_id, sub_activity_id, label, completed)
            VALUES (${entryId}, NULL, ${label.trim()}, 0)
          `;
        }
      }
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const entryId = Number(params.id);
    const { entry_sub_activity_id, completed } = await req.json();
    if (entry_sub_activity_id == null || completed == null) {
      return NextResponse.json({ error: 'entry_sub_activity_id and completed are required' }, { status: 400 });
    }
    const result = await sql`
      UPDATE schedule_entry_sub_activities
      SET completed = ${completed ? 1 : 0}
      WHERE id = ${Number(entry_sub_activity_id)} AND entry_id = ${entryId}
    `;
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
