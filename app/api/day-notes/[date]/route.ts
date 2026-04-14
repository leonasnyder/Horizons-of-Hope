import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/day-notes/[date] — fetch note for a specific date
export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { date } = params;

  const rows = await sql`
    SELECT content, updated_at
    FROM hoh_day_notes
    WHERE user_id = ${userId} AND note_date = ${date}
    LIMIT 1
  `;

  if ((rows as unknown[]).length === 0) {
    return NextResponse.json({ content: '', updated_at: null });
  }

  const row = (rows as unknown as Array<{ content: string; updated_at: string }>)[0];
  return NextResponse.json(row);
}

// PATCH /api/day-notes/[date] — upsert note for a date
export async function PATCH(
  req: NextRequest,
  { params }: { params: { date: string } }
) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { date } = params;
  const { content } = await req.json();

  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content must be a string' }, { status: 400 });
  }

  await sql`
    INSERT INTO hoh_day_notes (user_id, note_date, content, updated_at)
    VALUES (${userId}, ${date}, ${content}, NOW())
    ON CONFLICT (user_id, note_date)
    DO UPDATE SET content = ${content}, updated_at = NOW()
  `;

  return NextResponse.json({ success: true });
}
