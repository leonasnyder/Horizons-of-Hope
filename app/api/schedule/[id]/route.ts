import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const id = Number(params.id);
    const allowed = ['time_slot', 'duration_minutes', 'notes', 'is_completed', 'removed', 'activity_id'];
    const updates = Object.fromEntries(allowed.filter(f => f in body).map(f => [f, body[f]]));
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    const [entry] = await sql`UPDATE schedule_entries SET ${sql(updates)} WHERE id = ${id} RETURNING *`;
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql`UPDATE schedule_entries SET removed = 1 WHERE id = ${Number(params.id)}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
