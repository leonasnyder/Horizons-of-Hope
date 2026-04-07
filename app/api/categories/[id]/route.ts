import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const body = await req.json();
    const rows = await sql`SELECT * FROM categories WHERE id = ${id}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = rows[0] as { name: string; color: string };

    const newName: string = (body.name ?? existing.name).trim();
    const newColor: string = body.color ?? existing.color;
    if (!newName) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });

    await sql.begin(async sql => {
      if (newName !== existing.name) {
        await sql`UPDATE activities SET category = ${newName} WHERE category = ${existing.name}`;
      }
      await sql`UPDATE categories SET name = ${newName}, color = ${newColor} WHERE id = ${id}`;
    });

    const [updated] = await sql`SELECT * FROM categories WHERE id = ${id}`;
    return NextResponse.json(updated);
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const rows = await sql`SELECT name FROM categories WHERE id = ${id}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { name } = rows[0] as { name: string };
    await sql.begin(async sql => {
      await sql`UPDATE activities SET category = NULL WHERE category = ${name}`;
      await sql`DELETE FROM categories WHERE id = ${id}`;
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
