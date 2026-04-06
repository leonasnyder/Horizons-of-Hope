import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const goals = db.prepare('SELECT * FROM goals ORDER BY sort_order, name').all();
    const subcats = db.prepare(
      'SELECT * FROM goal_subcategories WHERE is_active = 1 ORDER BY goal_id, sort_order'
    ).all();
    const result = (goals as Array<{ id: number } & Record<string, unknown>>).map(g => ({
      ...g,
      subcategories: (subcats as Array<{ goal_id: number } & Record<string, unknown>>).filter(s => s.goal_id === g.id),
    }));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, description, color, subcategories } = body;
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM goals').get() as { m: number | null }).m ?? -1;
    const result = db.prepare(
      'INSERT INTO goals (name, description, color, sort_order) VALUES (?, ?, ?, ?)'
    ).run(name, description ?? null, color ?? '#0EA5E9', maxOrder + 1);
    const id = result.lastInsertRowid;

    if (Array.isArray(subcategories)) {
      const ins = db.prepare(
        'INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order) VALUES (?, ?, ?, ?)'
      );
      subcategories.forEach((s: { response_type: string; label: string; sort_order?: number }, i: number) => {
        ins.run(id, s.response_type, s.label, s.sort_order ?? i);
      });
    }

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    const subs = db.prepare('SELECT * FROM goal_subcategories WHERE goal_id = ?').all(id);
    return NextResponse.json({ ...goal as object, subcategories: subs }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
