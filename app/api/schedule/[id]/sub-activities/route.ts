import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

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
