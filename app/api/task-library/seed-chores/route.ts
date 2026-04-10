import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { CHORES_LIBRARY_SEED } from '@/lib/task-library-chores-seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  // Check if chores are already seeded (look for a known chores category name)
  const existing = await sql`
    SELECT id FROM task_library_categories
    WHERE user_id = ${userId} AND name = 'Kitchen — Daily'
    LIMIT 1
  `;

  if ((existing as unknown[]).length > 0) {
    return NextResponse.json({ message: 'Household chores already added' });
  }

  await sql.begin(async sql => {
    for (const cat of CHORES_LIBRARY_SEED) {
      const [{ id: categoryId }] = await sql`
        INSERT INTO task_library_categories (user_id, name, sort_order)
        VALUES (${userId}, ${cat.name}, ${cat.sort_order})
        RETURNING id
      ` as Array<{ id: number }>;

      for (let i = 0; i < cat.items.length; i++) {
        await sql`
          INSERT INTO task_library_items (user_id, category_id, label, sort_order)
          VALUES (${userId}, ${categoryId}, ${cat.items[i]}, ${i})
        `;
      }
    }
  });

  return NextResponse.json({ success: true, categories: CHORES_LIBRARY_SEED.length });
}
