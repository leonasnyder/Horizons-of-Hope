import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(Number(params.id));
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const subcats = db.prepare('SELECT * FROM goal_subcategories WHERE goal_id = ? ORDER BY sort_order').all(Number(params.id));
    return NextResponse.json({ ...goal as object, subcategories: subcats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = Number(params.id);

    const fields = ['name', 'description', 'color', 'is_active', 'sort_order'];
    const updates = fields.filter(f => f in body);
    if (updates.length > 0) {
      db.prepare(`UPDATE goals SET ${updates.map(f => `${f} = ?`).join(', ')} WHERE id = ?`)
        .run(...updates.map(f => body[f]), id);
    }

    if (Array.isArray(body.subcategories)) {
      const upsert = db.prepare(`
        INSERT INTO goal_subcategories (id, goal_id, response_type, label, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET label = excluded.label, sort_order = excluded.sort_order, is_active = excluded.is_active
      `);
      const ins = db.prepare(
        'INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order) VALUES (?, ?, ?, ?)'
      );
      db.transaction(() => {
        for (const s of body.subcategories) {
          if (s.id) upsert.run(s.id, id, s.response_type, s.label, s.sort_order ?? 0, s.is_active ?? 1);
          else ins.run(id, s.response_type, s.label, s.sort_order ?? 0);
        }
      })();
    }

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    const subcats = db.prepare('SELECT * FROM goal_subcategories WHERE goal_id = ? ORDER BY sort_order').all(id);
    return NextResponse.json({ ...goal as object, subcategories: subcats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('UPDATE goals SET is_active = 0 WHERE id = ?').run(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
