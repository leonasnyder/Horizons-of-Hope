import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    return NextResponse.json(categories);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { name, color } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM categories').get() as { m: number }).m;
    const result = db.prepare(
      `INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)`
    ).run(name.trim(), color ?? '#6B7280', maxOrder + 1);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
