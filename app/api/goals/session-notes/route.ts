import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Ensure the goal_session_notes table exists. Safe to call every request —
// CREATE TABLE IF NOT EXISTS is a no-op once the table is there. This
// removes the need for a manual migration in the Supabase SQL editor.
let _tableEnsured = false;
async function ensureTable() {
  if (_tableEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS goal_session_notes (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      notes TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, goal_id, date)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_goal_session_notes_user_goal_date
      ON goal_session_notes(user_id, goal_id, date)
  `;
  _tableEnsured = true;
}

export async function GET(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    await ensureTable();
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
    console.error('[session-notes GET]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    await ensureTable();
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
    console.error('[session-notes POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
