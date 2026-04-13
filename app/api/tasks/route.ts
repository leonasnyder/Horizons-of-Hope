import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tasks — fetch all PA tasks for the current user
export async function GET() {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const tasks = await sql`
    SELECT id, title, notes, is_completed, completed_at, created_at
    FROM pa_tasks
    WHERE user_id = ${user.id}
    ORDER BY is_completed ASC, created_at DESC
  `;

  return NextResponse.json(tasks);
}

// POST /api/tasks — create a new PA task
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { title, notes } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const [task] = await sql`
    INSERT INTO pa_tasks (user_id, title, notes)
    VALUES (${user.id}, ${title.trim()}, ${notes ?? null})
    RETURNING id, title, notes, is_completed, completed_at, created_at
  `;

  return NextResponse.json(task, { status: 201 });
}
