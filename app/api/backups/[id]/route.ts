import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const rows = await sql`SELECT label, data FROM backups WHERE id = ${Number(params.id)}`;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { label, data } = rows[0] as { label: string; data: unknown };
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="horizons-backup-${label}.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
