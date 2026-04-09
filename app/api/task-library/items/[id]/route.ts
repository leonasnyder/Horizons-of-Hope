import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const id = Number(params.id);
  const { label, sort_order } = await req.json();

  const [item] = await sql`
    UPDATE task_library_items
    SET label = COALESCE(${label?.trim() ?? null}, label),
        sort_order = COALESCE(${sort_order ?? null}, sort_order)
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, category_id, label, sort_order
  `;

  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const id = Number(params.id);
  await sql`DELETE FROM task_library_items WHERE id = ${id} AND user_id = ${userId}`;
  return NextResponse.json({ success: true });
}
