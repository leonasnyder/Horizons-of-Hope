import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const id = Number(params.id);
    const body = await req.json();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as { name: string; color: string } | undefined;
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const newName: string = (body.name ?? existing.name).trim();
    const newColor: string = body.color ?? existing.color;
    if (!newName) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });

    // If name changed, update all activities that use the old name
    if (newName !== existing.name) {
      db.prepare('UPDATE activities SET category = ? WHERE category = ?').run(newName, existing.name);
    }

    db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(newName, newColor, id);
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const id = Number(params.id);
    const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(id) as { name: string } | undefined;
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Null out activities that used this category
    db.prepare('UPDATE activities SET category = NULL WHERE category = ?').run(cat.name);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
