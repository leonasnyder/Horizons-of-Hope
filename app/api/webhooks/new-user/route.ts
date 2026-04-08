import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Supabase sends user data in body.record for auth.users events
    const email = body?.record?.email ?? body?.email ?? 'Unknown';
    const createdAt = body?.record?.created_at ?? new Date().toISOString();

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
