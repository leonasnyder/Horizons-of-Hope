import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const query = includeArchived
      ? 'SELECT * FROM activities ORDER BY category, name'
      : 'SELECT * FROM activities WHERE is_archived = 0 ORDER BY category, name';
    const activities = db.prepare(query).all();
    return NextResponse.json(activities);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, description, category, color, is_default, default_time, default_duration } = body;
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const result = db.prepare(
      `INSERT INTO activities (name, description, category, color, is_default) VALUES (?, ?, ?, ?, ?)`
    ).run(name, description ?? null, category ?? null, color ?? '#F97316', is_default ?? 0);

    const id = result.lastInsertRowid;
    if (default_time) {
      db.prepare(
        `INSERT INTO activity_defaults (activity_id, default_time, default_duration) VALUES (?, ?, ?)`
      ).run(id, default_time, default_duration ?? 30);
    }

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
