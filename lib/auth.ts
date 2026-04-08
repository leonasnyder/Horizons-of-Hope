import { createSupabaseServerClient } from './supabase/server';
import { NextResponse } from 'next/server';

export async function requireUser(): Promise<
  { userId: string; errorResponse: null } |
  { userId: null; errorResponse: NextResponse }
> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      userId: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { userId: user.id, errorResponse: null };
}
