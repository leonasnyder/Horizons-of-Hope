import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 });
    const rows = await sql`
      SELECT DISTINCT date FROM schedule_entries
      WHERE date LIKE ${month + '%'} AND removed = 0
      ORDER BY date
    `;
    return NextResponse.json((rows as unknown as Array<{ date: string }>).map(r => r.date));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
