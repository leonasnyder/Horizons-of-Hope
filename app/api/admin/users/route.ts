import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = process.env.NOTIFY_EMAIL ?? 'horizonsofhopeorg@gmail.com';

async function requireAdmin() {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return { userId: null, adminError: errorResponse };

  const admin = createSupabaseAdminClient();
  const { data: { user } } = await admin.auth.admin.getUserById(userId);
  if (!user || user.email !== ADMIN_EMAIL) {
    return {
      userId: null,
      adminError: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { userId, adminError: null };
}

export async function GET() {
  const { adminError } = await requireAdmin();
  if (adminError) return adminError;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }));

  return NextResponse.json(users);
}
