import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await sql`SELECT * FROM categories ORDER BY sort_order, name`;
    return NextResponse.json(categories);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, color } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const result = await sql`SELECT COALESCE(MAX(sort_order), -1) as m FROM categories`;
    const m = result[0].m;
    const [category] = await sql`
      INSERT INTO categories (name, color, sort_order)
      VALUES (${name.trim()}, ${color ?? '#6B7280'}, ${Number(m) + 1})
      RETURNING *
    `;
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
