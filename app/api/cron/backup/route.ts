import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron (or manually with the secret)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      activities: await sql`SELECT * FROM activities`,
      activity_defaults: await sql`SELECT * FROM activity_defaults`,
      activity_sub_activities: await sql`SELECT * FROM activity_sub_activities`,
      schedule_entries: await sql`SELECT * FROM schedule_entries`,
      schedule_entry_sub_activities: await sql`SELECT * FROM schedule_entry_sub_activities`,
      activity_usage_log: await sql`SELECT * FROM activity_usage_log`,
      goals: await sql`SELECT * FROM goals`,
      goal_subcategories: await sql`SELECT * FROM goal_subcategories`,
      goal_responses: await sql`SELECT * FROM goal_responses`,
      app_settings: await sql`SELECT * FROM app_settings`,
    };

    const label = new Date().toISOString().split('T')[0]; // e.g. "2026-04-10"

    await sql`
      INSERT INTO backups (label, data)
      VALUES (${label}, ${JSON.stringify(data)})
    `;

    // Keep only the 14 most recent backups
    await sql`
      DELETE FROM backups
      WHERE id NOT IN (
        SELECT id FROM backups ORDER BY created_at DESC LIMIT 14
      )
    `;

    return NextResponse.json({ success: true, label });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
