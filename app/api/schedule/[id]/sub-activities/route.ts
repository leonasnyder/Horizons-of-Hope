import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const entryId = Number(params.id);
    const { entry_sub_activity_id, completed } = await req.json();
    if (entry_sub_activity_id == null || completed == null) {
      return NextResponse.json({ error: 'entry_sub_activity_id and completed are required' }, { status: 400 });
    }
    const result = db.prepare(
      'UPDATE schedule_entry_sub_activities SET completed = ? WHERE id = ? AND entry_id = ?'
    ).run(completed ? 1 : 0, Number(entry_sub_activity_id), entryId);
    if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
