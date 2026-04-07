import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const activities = includeArchived
      ? await sql`SELECT * FROM activities ORDER BY category, name`
      : await sql`SELECT * FROM activities WHERE is_archived = 0 ORDER BY category, name`;
    return NextResponse.json(activities);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, category, color, is_default, default_time, default_duration, days_of_week } = body;
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const [activity] = await sql`
      INSERT INTO activities (name, description, category, color, is_default)
      VALUES (${name}, ${description ?? null}, ${category ?? null}, ${color ?? '#F97316'}, ${is_default ?? 0})
      RETURNING *
    `;

    if (default_time) {
      await sql`
        INSERT INTO activity_defaults (activity_id, default_time, default_duration, days_of_week)
        VALUES (${activity.id}, ${default_time}, ${default_duration ?? 30}, ${days_of_week ?? null})
      `;
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
