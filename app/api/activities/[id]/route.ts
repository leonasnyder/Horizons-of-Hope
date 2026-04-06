import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(Number(params.id));
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const defaults = db.prepare('SELECT * FROM activity_defaults WHERE activity_id = ?').get(Number(params.id));
    return NextResponse.json({ ...activity as object, defaults });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = Number(params.id);
    const fields = ['name', 'description', 'category', 'color', 'is_default', 'is_archived'];
    const updates = fields.filter(f => f in body);
    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    const setClause = updates.map(f => `${f} = ?`).join(', ');
    const values = updates.map(f => body[f]);
    db.prepare(`UPDATE activities SET ${setClause} WHERE id = ?`).run(...values, id);

    if ('default_time' in body || 'default_duration' in body) {
      const existing = db.prepare('SELECT id FROM activity_defaults WHERE activity_id = ?').get(id);
      if (existing) {
        db.prepare('UPDATE activity_defaults SET default_time = ?, default_duration = ? WHERE activity_id = ?')
          .run(body.default_time, body.default_duration ?? 30, id);
      } else {
        db.prepare('INSERT INTO activity_defaults (activity_id, default_time, default_duration) VALUES (?, ?, ?)')
          .run(id, body.default_time, body.default_duration ?? 30);
      }
    }

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
    return NextResponse.json(activity);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('UPDATE activities SET is_archived = 1 WHERE id = ?').run(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
