import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; subId: string } }) {
  try {
    const result = await sql`
      UPDATE activity_sub_activities SET is_active = 0
      WHERE id = ${Number(params.subId)} AND activity_id = ${Number(params.id)}
    `;
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
