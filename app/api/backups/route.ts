import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const backups = await sql`
      SELECT id, label, created_at FROM backups ORDER BY created_at DESC LIMIT 14
    `;
    return NextResponse.json(backups);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
