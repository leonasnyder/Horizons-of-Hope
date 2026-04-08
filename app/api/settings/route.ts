import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const rows = await sql`SELECT * FROM app_settings WHERE user_id = ${userId}` as unknown as Array<{ key: string; value: string }>;
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const defaults = {
      notifications_enabled: 'false',
      notification_offset: '10',
      schedule_start: '07:00',
      schedule_end: '18:00',
      slot_interval: '30',
      staleness_amber: '4',
      staleness_red: '6',
      theme: 'system',
    };
    return NextResponse.json({ ...defaults, ...settings });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    await sql.begin(async sql => {
      for (const [key, value] of Object.entries(body)) {
        await sql`
          INSERT INTO app_settings (user_id, key, value) VALUES (${userId}, ${key}, ${String(value)})
          ON CONFLICT(user_id, key) DO UPDATE SET value = EXCLUDED.value
        `;
      }
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
