import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; subId: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const activity = await sql`SELECT id FROM activities WHERE id = ${Number(params.id)} AND user_id = ${userId}`;
    if (activity.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
