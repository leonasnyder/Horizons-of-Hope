import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subs = await sql`
      SELECT * FROM activity_sub_activities
      WHERE activity_id = ${Number(params.id)} AND is_active = 1
      ORDER BY sort_order, id
    `;
    return NextResponse.json(subs);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const activityId = Number(params.id);
    const activity = await sql`SELECT id FROM activities WHERE id = ${activityId} AND is_archived = 0`;
    if (activity.length === 0) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    const { label } = await req.json();
    if (!label?.trim()) return NextResponse.json({ error: 'label is required' }, { status: 400 });
    const result = await sql`
      SELECT COALESCE(MAX(sort_order), -1) as m FROM activity_sub_activities WHERE activity_id = ${activityId}
    `;
    const m = result[0].m;
    const [sub] = await sql`
      INSERT INTO activity_sub_activities (activity_id, label, sort_order)
      VALUES (${activityId}, ${label.trim()}, ${Number(m) + 1})
      RETURNING *
    `;
    return NextResponse.json(sub, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
