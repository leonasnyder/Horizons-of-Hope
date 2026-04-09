import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import sql from '@/lib/db';
import { TASK_LIBRARY_SEED } from '@/lib/task-library-seed';

export const dynamic = 'force-dynamic';

async function seedTaskLibrary(userId: string) {
  // Only seed if user has no library yet
  const existing = await sql`
    SELECT id FROM task_library_categories WHERE user_id = ${userId} LIMIT 1
  `;
  if ((existing as unknown[]).length > 0) return;

  await sql.begin(async sql => {
    for (const cat of TASK_LIBRARY_SEED) {
      const [{ id: categoryId }] = await sql`
        INSERT INTO task_library_categories (user_id, name, sort_order)
        VALUES (${userId}, ${cat.name}, ${cat.sort_order})
        RETURNING id
      ` as Array<{ id: number }>;

      for (let i = 0; i < cat.items.length; i++) {
        await sql`
          INSERT INTO task_library_items (user_id, category_id, label, sort_order)
          VALUES (${userId}, ${categoryId}, ${cat.items[i]}, ${i})
        `;
      }
    }
  });
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const body = await req.json();

    const email = body?.record?.email ?? body?.email ?? 'Unknown';
    const userId = body?.record?.id ?? body?.id ?? null;
    const createdAt = body?.record?.created_at ?? new Date().toISOString();

    // Seed task library for new user
    if (userId) {
      await seedTaskLibrary(userId);
    }

    await resend.emails.send({
      from: 'Horizons of Hope <onboarding@resend.dev>',
      to: process.env.NOTIFY_EMAIL!,
      subject: 'New user signed up — Horizons of Hope',
      html: `
        <p>A new user has signed up for your Horizons of Hope app.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Signed up:</strong> ${new Date(createdAt).toLocaleString()}</p>
        <p>You can view and manage users in your <a href="https://supabase.com/dashboard/project/wagrrwhpjpzkcvnopftw/auth/users">Supabase dashboard</a>.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
