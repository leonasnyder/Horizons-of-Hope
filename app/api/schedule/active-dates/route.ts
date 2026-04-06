import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 });
    const rows = db.prepare(`
      SELECT DISTINCT date FROM schedule_entries
      WHERE date LIKE ? AND removed = 0
      ORDER BY date
    `).all(`${month}%`) as Array<{ date: string }>;
    return NextResponse.json(rows.map(r => r.date));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
