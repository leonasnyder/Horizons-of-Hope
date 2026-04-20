import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const id = Number(params.id);

    // Ownership check: only let users mutate their own schedule entries.
    const owned = await sql`SELECT id FROM schedule_entries WHERE id = ${id} AND user_id = ${userId}`;
    if (owned.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = ['time_slot', 'duration_minutes', 'notes', 'is_completed', 'removed', 'activity_id'];
    const updates = Object.fromEntries(allowed.filter(f => f in body).map(f => [f, body[f]]));
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    const [entry] = await sql`
      UPDATE schedule_entries SET ${sql(updates)}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(entry);
  } catch (e) {
    console.error('[schedule[id] PATCH]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const result = await sql`
      UPDATE schedule_entries SET removed = 1
      WHERE id = ${id} AND user_id = ${userId}
    `;
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[schedule[id] DELETE]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
