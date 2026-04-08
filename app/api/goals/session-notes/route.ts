import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const goalId = searchParams.get('goal_id');
    const date = searchParams.get('date');
    if (!goalId || !date) return NextResponse.json({ error: 'goal_id and date required' }, { status: 400 });
    const rows = await sql`
      SELECT notes FROM goal_session_notes
      WHERE user_id = ${userId} AND goal_id = ${Number(goalId)} AND date = ${date}
    `;
    return NextResponse.json({ notes: rows[0]?.notes ?? '' });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { goal_id, date, notes } = await req.json();
    if (!goal_id || !date) return NextResponse.json({ error: 'goal_id and date required' }, { status: 400 });
    if (!notes || !notes.trim()) {
      await sql`
        DELETE FROM goal_session_notes
        WHERE user_id = ${userId} AND goal_id = ${Number(goal_id)} AND date = ${date}
      `;
      return NextResponse.json({ success: true });
    }
    await sql`
      INSERT INTO goal_session_notes (user_id, goal_id, date, notes, updated_at)
      VALUES (${userId}, ${Number(goal_id)}, ${date}, ${notes.trim()}, NOW())
      ON CONFLICT(user_id, goal_id, date) DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW()
    `;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
