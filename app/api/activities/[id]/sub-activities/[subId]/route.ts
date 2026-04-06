import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; subId: string } }) {
  try {
    const db = getDb();
    const result = db.prepare('UPDATE activity_sub_activities SET is_active = 0 WHERE id = ? AND activity_id = ?')
      .run(Number(params.subId), Number(params.id));
    if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
