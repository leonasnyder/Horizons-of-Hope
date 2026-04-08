import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const rows = await sql`SELECT * FROM goals WHERE id = ${id} AND user_id = ${userId}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const subcats = await sql`SELECT * FROM goal_subcategories WHERE goal_id = ${id} ORDER BY label`;
    return NextResponse.json({ ...rows[0], subcategories: subcats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const id = Number(params.id);

    const owned = await sql`SELECT id FROM goals WHERE id = ${id} AND user_id = ${userId}`;
    if (owned.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = ['name', 'description', 'color', 'is_active', 'sort_order'];
    const updates = Object.fromEntries(allowed.filter(f => f in body).map(f => [f, body[f]]));
    if (Object.keys(updates).length > 0) {
      await sql`UPDATE goals SET ${sql(updates)} WHERE id = ${id} AND user_id = ${userId}`;
    }

    if (Array.isArray(body.subcategories)) {
      await sql.begin(async sql => {
        for (const s of body.subcategories) {
          if (s.id) {
            await sql`
              INSERT INTO goal_subcategories (id, goal_id, response_type, label, sort_order, is_active)
              VALUES (${s.id}, ${id}, ${s.response_type}, ${s.label}, ${s.sort_order ?? 0}, ${s.is_active ?? 1})
              ON CONFLICT(id) DO UPDATE SET
                label = EXCLUDED.label,
                sort_order = EXCLUDED.sort_order,
                is_active = EXCLUDED.is_active
            `;
          } else {
            await sql`
              INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order)
              VALUES (${id}, ${s.response_type}, ${s.label}, ${s.sort_order ?? 0})
            `;
          }
        }
      });
    }

    const [goal] = await sql`SELECT * FROM goals WHERE id = ${id} AND user_id = ${userId}`;
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const subcats = await sql`SELECT * FROM goal_subcategories WHERE goal_id = ${id} ORDER BY label`;
    return NextResponse.json({ ...goal, subcategories: subcats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    await sql`UPDATE goals SET is_active = 0 WHERE id = ${Number(params.id)} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
