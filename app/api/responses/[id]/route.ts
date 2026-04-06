import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('DELETE FROM goal_responses WHERE id = ?').run(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const id = Number(params.id);
    const body = await req.json();
    const existing = db.prepare('SELECT * FROM goal_responses WHERE id = ?').get(id) as {
      goal_id: number; subcategory_id: number | null; response_type: string; session_notes: string | null;
    } | undefined;
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const response_type: string = body.response_type ?? existing.response_type;
    if (response_type !== 'correct' && response_type !== 'incorrect') {
      return NextResponse.json({ error: 'response_type must be correct or incorrect' }, { status: 400 });
    }
    const subcategory_id: number | null = 'subcategory_id' in body ? (body.subcategory_id ?? null) : existing.subcategory_id;
    const session_notes: string | null = 'session_notes' in body ? (body.session_notes ?? null) : existing.session_notes;

    db.prepare(
      'UPDATE goal_responses SET response_type = ?, subcategory_id = ?, session_notes = ? WHERE id = ?'
    ).run(response_type, subcategory_id, session_notes, id);

    const row = db.prepare(`
      SELECT gr.*, gs.label as subcategory_label
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      WHERE gr.id = ?
    `).get(id);
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
