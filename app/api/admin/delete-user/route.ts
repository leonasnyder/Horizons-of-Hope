import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import sql from '@/lib/db';

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

export async function DELETE(req: NextRequest) {
  const { adminError } = await requireAdmin();
  if (adminError) return adminError;

  const { targetUserId } = await req.json();
  if (!targetUserId) {
    return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
  }

  // Verify target user exists
  const admin = createSupabaseAdminClient();
  const { data: { user: targetUser }, error: lookupError } = await admin.auth.admin.getUserById(targetUserId);
  if (lookupError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Safety: prevent deleting the admin account
  if (targetUser.email === ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot delete the admin account' }, { status: 403 });
  }

  // Delete user-scoped app data only (activities are per user_id, safe to delete)
  await sql`DELETE FROM task_library_items WHERE user_id = ${targetUserId}`;
  await sql`DELETE FROM task_library_categories WHERE user_id = ${targetUserId}`;

  // Delete the auth user via admin API (safe — no FK cascade issues)
  const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: targetUser.email });
}
