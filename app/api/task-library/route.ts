import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/task-library — all categories with their items
export async function GET() {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const categoriesRaw = await sql`
    SELECT id, name, sort_order
    FROM task_library_categories
    WHERE user_id = ${userId}
    ORDER BY sort_order, name
  ` as unknown as Array<{ id: number; name: string; sort_order: number }>;

  if (categoriesRaw.length === 0) {
    return NextResponse.json([]);
  }

  const categoryIds = categoriesRaw.map(c => c.id);
  const itemsRaw = await sql`
    SELECT id, category_id, label, sort_order
    FROM task_library_items
    WHERE user_id = ${userId} AND category_id = ANY(${categoryIds})
    ORDER BY sort_order, label
  ` as unknown as Array<{ id: number; category_id: number; label: string; sort_order: number }>;

  const itemsByCategory: Record<number, Array<{ id: number; label: string; sort_order: number }>> = {};
  for (const item of itemsRaw) {
    (itemsByCategory[item.category_id] ??= []).push({ id: item.id, label: item.label, sort_order: item.sort_order });
  }

  const result = categoriesRaw.map(c => ({
    ...c,
    items: itemsByCategory[c.id] ?? [],
  }));

  return NextResponse.json(result);
}

// POST /api/task-library — create a new category
export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { name, sort_order } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const [cat] = await sql`
    INSERT INTO task_library_categories (user_id, name, sort_order)
    VALUES (${userId}, ${name.trim()}, ${sort_order ?? 0})
    RETURNING id, name, sort_order
  `;

  return NextResponse.json({ ...cat, items: [] }, { status: 201 });
}
