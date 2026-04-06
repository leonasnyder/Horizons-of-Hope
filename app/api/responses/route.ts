import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const goalId = searchParams.get('goalId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = `
      SELECT gr.*, gs.label as subcategory_label, g.name as goal_name, g.color as goal_color
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      LEFT JOIN goals g ON gr.goal_id = g.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];
    if (date) { query += ' AND gr.date = ?'; args.push(date); }
    if (startDate) { query += ' AND gr.date >= ?'; args.push(startDate); }
    if (endDate) { query += ' AND gr.date <= ?'; args.push(endDate); }
    if (goalId) { query += ' AND gr.goal_id = ?'; args.push(Number(goalId)); }
    query += ' ORDER BY gr.timestamp DESC';

    return NextResponse.json(db.prepare(query).all(...args));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { goal_id, subcategory_id, response_type, date, session_notes } = body;
    if (!goal_id || !response_type || !date) {
      return NextResponse.json({ error: 'goal_id, response_type, date required' }, { status: 400 });
    }
    const result = db.prepare(
      `INSERT INTO goal_responses (goal_id, subcategory_id, response_type, date, session_notes) VALUES (?, ?, ?, ?, ?)`
    ).run(goal_id, subcategory_id ?? null, response_type, date, session_notes ?? null);

    const row = db.prepare(`
      SELECT gr.*, gs.label as subcategory_label
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      WHERE gr.id = ?
    `).get(result.lastInsertRowid);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
