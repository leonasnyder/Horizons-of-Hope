import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/task-library/items — create a new item
export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { category_id, label, sort_order } = await req.json();
  if (!category_id || !label?.trim()) {
    return NextResponse.json({ error: 'category_id and label required' }, { status: 400 });
  }

  // Verify category belongs to this user
  const [cat] = await sql`
    SELECT id FROM task_library_categories WHERE id = ${category_id} AND user_id = ${userId}
  `;
  if (!cat) return NextResponse.json({ error: 'category not found' }, { status: 404 });

  const [item] = await sql`
    INSERT INTO task_library_items (user_id, category_id, label, sort_order)
    VALUES (${userId}, ${category_id}, ${label.trim()}, ${sort_order ?? 0})
    RETURNING id, category_id, label, sort_order
  `;

  return NextResponse.json(item, { status: 201 });
}
