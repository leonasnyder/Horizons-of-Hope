import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = Number(params.id);
    const fields = ['time_slot', 'duration_minutes', 'notes', 'is_completed', 'removed', 'activity_id'];
    const updates = fields.filter(f => f in body);
    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    const setClause = updates.map(f => `${f} = ?`).join(', ');
    db.prepare(`UPDATE schedule_entries SET ${setClause} WHERE id = ?`).run(...updates.map(f => body[f]), id);
    const entry = db.prepare('SELECT * FROM schedule_entries WHERE id = ?').get(id);
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('UPDATE schedule_entries SET removed = 1 WHERE id = ?').run(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
