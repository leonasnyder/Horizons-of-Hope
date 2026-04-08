import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const owned = await sql`SELECT id FROM goal_responses WHERE id = ${id} AND user_id = ${userId}`;
    if (owned.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await sql`DELETE FROM goal_responses WHERE id = ${id} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const body = await req.json();
    const rows = await sql`SELECT * FROM goal_responses WHERE id = ${id} AND user_id = ${userId}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = rows[0] as {
      goal_id: number; subcategory_id: number | null; response_type: string; session_notes: string | null;
    };

    const response_type: string = body.response_type ?? existing.response_type;
    if (response_type !== 'correct' && response_type !== 'incorrect') {
      return NextResponse.json({ error: 'response_type must be correct or incorrect' }, { status: 400 });
    }
    const subcategory_id: number | null = 'subcategory_id' in body ? (body.subcategory_id ?? null) : existing.subcategory_id;
    const session_notes: string | null = 'session_notes' in body ? (body.session_notes ?? null) : existing.session_notes;

    await sql`
      UPDATE goal_responses SET response_type = ${response_type}, subcategory_id = ${subcategory_id}, session_notes = ${session_notes}
      WHERE id = ${id} AND user_id = ${userId}
    `;

    const [row] = await sql`
      SELECT gr.*, gs.label as subcategory_label
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      WHERE gr.id = ${id}
    `;
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
