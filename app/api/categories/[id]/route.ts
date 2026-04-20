import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const body = await req.json();

    // Ownership check: only edit categories that belong to this user
    // (or legacy NULL-owner rows, which get claimed in the same query).
    const rows = await sql`
      SELECT * FROM categories WHERE id = ${id} AND (user_id = ${userId} OR user_id IS NULL)
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = rows[0] as { name: string; color: string };

    const newName: string = (body.name ?? existing.name).trim();
    const newColor: string = body.color ?? existing.color;
    if (!newName) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });

    await sql.begin(async sql => {
      if (newName !== existing.name) {
        await sql`
          UPDATE activities SET category = ${newName}
          WHERE category = ${existing.name} AND user_id = ${userId}
        `;
      }
      await sql`
        UPDATE categories
        SET name = ${newName}, color = ${newColor}, user_id = ${userId}
        WHERE id = ${id}
      `;
    });

    const [updated] = await sql`SELECT * FROM categories WHERE id = ${id}`;
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 });
    }
    console.error('[categories PATCH]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const rows = await sql`
      SELECT name FROM categories WHERE id = ${id} AND (user_id = ${userId} OR user_id IS NULL)
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { name } = rows[0] as { name: string };
    await sql.begin(async sql => {
      await sql`
        UPDATE activities SET category = NULL
        WHERE category = ${name} AND user_id = ${userId}
      `;
      await sql`DELETE FROM categories WHERE id = ${id}`;
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[categories DELETE]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
