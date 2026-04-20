import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Ensure the `user_id` column exists on `categories`. Safe no-op if
// the column is already there — matches the pattern used by
// goal_session_notes so fresh installs self-heal without a manual
// migration step.
let _columnEnsured = false;
async function ensureUserIdColumn() {
  if (_columnEnsured) return;
  try {
    await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID`;
  } catch {
    // ignore — column exists or we lack perms; API will still work
  }
  _columnEnsured = true;
}

// Claim any legacy NULL-owner category rows for the current user.
// Runs once per process per user; cheap UPDATE with no WHERE match
// when there's nothing to claim.
const _claimedUsers = new Set<string>();
async function claimLegacyCategories(userId: string) {
  if (_claimedUsers.has(userId)) return;
  try {
    await sql`UPDATE categories SET user_id = ${userId} WHERE user_id IS NULL`;
  } catch {
    // ignore — best-effort auto-heal
  }
  _claimedUsers.add(userId);
}

export async function GET() {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    await ensureUserIdColumn();
    await claimLegacyCategories(userId);
    const categories = await sql`
      SELECT * FROM categories
      WHERE user_id = ${userId}
      ORDER BY sort_order, name
    `;
    return NextResponse.json(categories);
  } catch (e) {
    console.error('[categories GET]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    await ensureUserIdColumn();
    await claimLegacyCategories(userId);
    const { name, color } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const result = await sql`
      SELECT COALESCE(MAX(sort_order), -1) as m FROM categories WHERE user_id = ${userId}
    `;
    const m = result[0].m;
    const [category] = await sql`
      INSERT INTO categories (user_id, name, color, sort_order)
      VALUES (${userId}, ${name.trim()}, ${color ?? '#6B7280'}, ${Number(m) + 1})
      RETURNING *
    `;
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 });
    }
    console.error('[categories POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
