import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const subs = db.prepare(
      'SELECT * FROM activity_sub_activities WHERE activity_id = ? AND is_active = 1 ORDER BY sort_order, id'
    ).all(Number(params.id));
    return NextResponse.json(subs);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const activityId = Number(params.id);
    const { label } = await req.json();
    if (!label?.trim()) return NextResponse.json({ error: 'label is required' }, { status: 400 });
    const maxOrder = (db.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) as m FROM activity_sub_activities WHERE activity_id = ?'
    ).get(activityId) as { m: number }).m;
    const result = db.prepare(
      'INSERT INTO activity_sub_activities (activity_id, label, sort_order) VALUES (?, ?, ?)'
    ).run(activityId, label.trim(), maxOrder + 1);
    const sub = db.prepare('SELECT * FROM activity_sub_activities WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(sub, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
