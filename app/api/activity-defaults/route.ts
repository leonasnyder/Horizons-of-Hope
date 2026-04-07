import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const defaults = await sql`
      SELECT ad.*, a.name, a.category, a.color
      FROM activity_defaults ad
      JOIN activities a ON ad.activity_id = a.id
      WHERE a.is_archived = 0
      ORDER BY ad.default_time
    `;
    return NextResponse.json(defaults);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
