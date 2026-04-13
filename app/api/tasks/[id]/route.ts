import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/tasks/[id] — update title, notes, or completion
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.title === 'string') updates.title = body.title.trim();
  if (typeof body.notes === 'string' || body.notes === null) updates.notes = body.notes;
  if (typeof body.is_completed === 'number') {
    updates.is_completed = body.is_completed;
    updates.completed_at = body.is_completed ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const [task] = await sql`
    UPDATE pa_tasks
    SET ${sql(updates)}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, title, notes, is_completed, completed_at, created_at
  `;

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

// DELETE /api/tasks/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  await sql`DELETE FROM pa_tasks WHERE id = ${id} AND user_id = ${userId}`;
  return new NextResponse(null, { status: 204 });
}
