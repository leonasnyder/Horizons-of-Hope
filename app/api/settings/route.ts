import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM app_settings').all() as Array<{ key: string; value: string }>;
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
  try {
    const db = getDb();
    const body = await req.json();
    const upsert = db.prepare(
      `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        upsert.run(key, String(value));
      }
    })();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
