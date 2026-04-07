import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const rows = await sql`SELECT * FROM activities WHERE id = ${id}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const defaults = await sql`SELECT * FROM activity_defaults WHERE activity_id = ${id}`;
    return NextResponse.json({ ...rows[0], defaults: defaults[0] ?? null });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const id = Number(params.id);
    const allowed = ['name', 'description', 'category', 'color', 'is_default', 'is_archived'];
    const updates = Object.fromEntries(allowed.filter(f => f in body).map(f => [f, body[f]]));
    if (Object.keys(updates).length === 0 && !('default_time' in body) && !('default_duration' in body)) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    if (Object.keys(updates).length > 0) {
      await sql`UPDATE activities SET ${sql(updates)} WHERE id = ${id}`;
    }

    if ('default_time' in body || 'default_duration' in body) {
      const existing = await sql`SELECT id FROM activity_defaults WHERE activity_id = ${id}`;
      if (existing.length > 0) {
        await sql`
          UPDATE activity_defaults
          SET default_time = ${body.default_time}, default_duration = ${body.default_duration ?? 30}
          WHERE activity_id = ${id}
        `;
      } else {
        await sql`
          INSERT INTO activity_defaults (activity_id, default_time, default_duration)
          VALUES (${id}, ${body.default_time}, ${body.default_duration ?? 30})
        `;
      }
    }

    const [activity] = await sql`SELECT * FROM activities WHERE id = ${id}`;
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(activity);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await sql`UPDATE activities SET is_archived = 1 WHERE id = ${Number(params.id)}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
