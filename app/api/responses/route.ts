import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const goalId = searchParams.get('goalId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = date ? sql`AND gr.date = ${date}` : sql``;
    const startFilter = startDate ? sql`AND gr.date >= ${startDate}` : sql``;
    const endFilter = endDate ? sql`AND gr.date <= ${endDate}` : sql``;
    const goalFilter = goalId ? sql`AND gr.goal_id = ${Number(goalId)}` : sql``;

    const rows = await sql`
      SELECT gr.*, gs.label as subcategory_label, g.name as goal_name, g.color as goal_color
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      LEFT JOIN goals g ON gr.goal_id = g.id
      WHERE gr.user_id = ${userId}
      ${dateFilter} ${startFilter} ${endFilter} ${goalFilter}
      ORDER BY gr.timestamp DESC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const { goal_id, subcategory_id, response_type, date, session_notes } = body;
    if (!goal_id || !response_type || !date) {
      return NextResponse.json({ error: 'goal_id, response_type, date required' }, { status: 400 });
    }

    const owned = await sql`SELECT id FROM goals WHERE id = ${goal_id} AND user_id = ${userId}`;
    if (owned.length === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const [inserted] = await sql`
      INSERT INTO goal_responses (user_id, goal_id, subcategory_id, response_type, date, session_notes)
      VALUES (${userId}, ${goal_id}, ${subcategory_id ?? null}, ${response_type}, ${date}, ${session_notes ?? null})
      RETURNING id
    `;
    const [row] = await sql`
      SELECT gr.*, gs.label as subcategory_label
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      WHERE gr.id = ${inserted.id}
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
