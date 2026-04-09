import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const id = Number(params.id);
  const { name, sort_order } = await req.json();

  const updates: string[] = [];
  if (name !== undefined) updates.push(`name = '${name.trim().replace(/'/g, "''")}'`);
  if (sort_order !== undefined) updates.push(`sort_order = ${Number(sort_order)}`);
  if (updates.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });

  const [cat] = await sql`
    UPDATE task_library_categories
    SET name = COALESCE(${name?.trim() ?? null}, name),
        sort_order = COALESCE(${sort_order ?? null}, sort_order)
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, name, sort_order
  `;

  if (!cat) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(cat);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const id = Number(params.id);
  await sql`DELETE FROM task_library_categories WHERE id = ${id} AND user_id = ${userId}`;
  return NextResponse.json({ success: true });
}
