# Multi-User Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase email/password authentication so each user has their own isolated schedule, activities, goals, and settings data.

**Architecture:** Use `@supabase/ssr` for session management via cookies in Next.js App Router. All API routes call a shared `requireUser()` helper that reads the session and returns the `user_id`. Every database query is scoped to `user_id`. Middleware redirects unauthenticated users to `/login`.

**Tech Stack:** Next.js 14 App Router, `@supabase/supabase-js`, `@supabase/ssr`, postgres.js (kept for all DB queries), Supabase Auth (email/password)

---

## File Map

**New files:**
- `lib/supabase/client.ts` — browser Supabase client (used in `'use client'` pages for auth actions)
- `lib/supabase/server.ts` — server Supabase client (reads cookies, used in API routes + middleware)
- `lib/auth.ts` — `requireUser()` helper called at top of every API route
- `middleware.ts` — session refresh + redirect unauthenticated users to `/login`
- `app/login/page.tsx` — email/password login form
- `app/signup/page.tsx` — email/password signup form
- `app/api/auth/callback/route.ts` — handles email confirmation redirect from Supabase
- `lib/migration-add-user-id.sql` — SQL to run once in Supabase SQL Editor

**Modified files:**
- `app/api/activities/route.ts` — scope queries to user_id
- `app/api/activities/[id]/route.ts` — scope queries to user_id
- `app/api/activities/[id]/sub-activities/route.ts` — verify activity ownership
- `app/api/schedule/route.ts` — scope queries to user_id
- `app/api/schedule/[id]/route.ts` — scope queries to user_id
- `app/api/goals/route.ts` — scope queries to user_id
- `app/api/goals/[id]/route.ts` — scope queries to user_id
- `app/api/responses/route.ts` — scope queries to user_id
- `app/api/analytics/route.ts` — scope queries to user_id
- `app/api/settings/route.ts` — scope queries to user_id
- `components/layout/TopNav.tsx` — add user email display + logout button

---

## Task 1: Install packages and configure environment variables

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`

- [ ] **Step 1: Install Supabase SSR packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected: packages added to `node_modules` and `package.json`.

- [ ] **Step 2: Add env vars to `.env.local`**

Find these values in: Supabase Dashboard → Project Settings → API

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

The project URL looks like `https://wagrrwhpjpzkcvnopftw.supabase.co` (the ref is the same string in your `DATABASE_URL`).

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

Expected: build succeeds (no errors from missing imports yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @supabase/supabase-js and @supabase/ssr"
```

---

## Task 2: Supabase client helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create browser client**

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server client**

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware handles refresh
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: add Supabase browser and server client helpers"
```

---

## Task 3: Auth helper

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: Create requireUser helper**

```ts
// lib/auth.ts
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: add requireUser auth helper for API routes"
```

---

## Task 4: Database migration

**Files:**
- Create: `lib/migration-add-user-id.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- lib/migration-add-user-id.sql
-- Run this ONCE in Supabase Dashboard → SQL Editor

-- Add user_id to user-scoped tables
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE schedule_entries
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE goal_responses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- activity_usage_log: change unique constraint to include user_id
ALTER TABLE activity_usage_log
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE activity_usage_log
  DROP CONSTRAINT IF EXISTS activity_usage_log_activity_id_week_start_key;
DELETE FROM activity_usage_log WHERE user_id IS NULL;
ALTER TABLE activity_usage_log
  ADD CONSTRAINT activity_usage_log_user_activity_week_key
  UNIQUE(user_id, activity_id, week_start);

-- app_settings: change primary key to (user_id, key)
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
DELETE FROM app_settings WHERE user_id IS NULL;
ALTER TABLE app_settings ADD PRIMARY KEY (user_id, key);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_user_id ON schedule_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_responses_user_id ON goal_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_usage_log_user_id ON activity_usage_log(user_id);
```

- [ ] **Step 2: Run migration in Supabase**

Go to Supabase Dashboard → SQL Editor → New query → paste the SQL above → Run.

Expected: no errors. All tables now have a `user_id` column.

- [ ] **Step 3: Commit the migration file**

```bash
git add lib/migration-add-user-id.sql
git commit -m "feat: add migration SQL to add user_id to all user-scoped tables"
```

---

## Task 5: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware**

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must call getUser(), not getSession()
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isApiRoute = pathname.startsWith('/api');
  const isPublicFile = pathname.includes('.');

  // Redirect unauthenticated users to login (except auth pages, API, and static files)
  if (!user && !isAuthPage && !isApiRoute && !isPublicFile) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged-in users away from login/signup
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/scheduler', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware for session refresh and auth-gated routing"
```

---

## Task 6: Login and Signup pages

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/signup/page.tsx`
- Create: `app/api/auth/callback/route.ts`

- [ ] **Step 1: Create login page**

```tsx
// app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/scheduler');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo.png"
            alt="Horizons of Hope"
            className="h-10 w-auto object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-lg font-bold text-gray-900">Horizons of Hope</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          No account?{' '}
          <a href="/signup" className="text-gray-700 underline font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create signup page**

```tsx
// app/signup/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Supabase may require email confirmation — show success or redirect
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            <a href="/login" className="text-gray-700 underline">Back to sign in</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/logo.png"
            alt="Horizons of Hope"
            className="h-10 w-auto object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-lg font-bold text-gray-900">Horizons of Hope</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-gray-700 underline font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create auth callback route**

```ts
// app/api/auth/callback/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/scheduler';

  if (code) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx app/signup/page.tsx app/api/auth/callback/route.ts
git commit -m "feat: add login, signup pages and auth callback route"
```

---

## Task 7: Update TopNav with user info and logout

**Files:**
- Modify: `components/layout/TopNav.tsx`

- [ ] **Step 1: Replace TopNav with auth-aware version**

```tsx
// components/layout/TopNav.tsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header id="top-nav" className="sticky top-0 z-50 bg-black shadow-md">
      <div className="flex items-center justify-between px-4 h-16 max-w-7xl mx-auto">
        <div id="top-nav-brand" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Horizons of Hope"
            className="h-10 w-auto object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xl font-bold text-white tracking-wide">
            Horizons of Hope
          </span>
        </div>

        <nav id="top-nav-tabs" className="flex gap-1">
          {[
            { href: '/scheduler', label: 'Daily Scheduler' },
            { href: '/tracker', label: 'Data Tracker' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center',
                pathname.startsWith(href)
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {email && (
            <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[160px]">
              {email}
            </span>
          )}
          <Link
            href="/settings"
            id="top-nav-settings"
            className={cn(
              'p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
              pathname === '/settings'
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/layout/TopNav.tsx
git commit -m "feat: add user email display and logout button to TopNav"
```

---

## Task 8: Update activities API routes

**Files:**
- Modify: `app/api/activities/route.ts`
- Modify: `app/api/activities/[id]/route.ts`
- Modify: `app/api/activities/[id]/sub-activities/route.ts`

- [ ] **Step 1: Update `app/api/activities/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const activities = includeArchived
      ? await sql`SELECT * FROM activities WHERE user_id = ${userId} ORDER BY name`
      : await sql`SELECT * FROM activities WHERE user_id = ${userId} AND is_archived = 0 ORDER BY name`;
    return NextResponse.json(activities);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const { name, description, category, color, is_default, default_time, default_duration, days_of_week } = body;
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const [activity] = await sql`
      INSERT INTO activities (user_id, name, description, category, color, is_default)
      VALUES (${userId}, ${name}, ${description ?? null}, ${category ?? null}, ${color ?? '#F97316'}, ${is_default ?? 0})
      RETURNING *
    `;

    if (default_time) {
      await sql`
        INSERT INTO activity_defaults (activity_id, default_time, default_duration, days_of_week)
        VALUES (${activity.id}, ${default_time}, ${default_duration ?? 30}, ${days_of_week ?? null})
      `;
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `app/api/activities/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const rows = await sql`SELECT * FROM activities WHERE id = ${id} AND user_id = ${userId}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const defaults = await sql`SELECT * FROM activity_defaults WHERE activity_id = ${id} ORDER BY default_time`;
    return NextResponse.json({ ...rows[0], defaults });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const id = Number(params.id);

    // Verify ownership
    const owned = await sql`SELECT id FROM activities WHERE id = ${id} AND user_id = ${userId}`;
    if (owned.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = ['name', 'description', 'category', 'color', 'is_default', 'is_archived'];
    const updates = Object.fromEntries(allowed.filter(f => f in body).map(f => [f, body[f]]));
    const hasActivityFields = Object.keys(updates).length > 0;
    const hasDefaultsArray = Array.isArray(body.defaults);
    const hasLegacyDefault = 'default_time' in body || 'default_duration' in body || 'days_of_week' in body;
    if (!hasActivityFields && !hasDefaultsArray && !hasLegacyDefault) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    if (hasActivityFields) {
      await sql`UPDATE activities SET ${sql(updates)} WHERE id = ${id} AND user_id = ${userId}`;
    }

    if (hasDefaultsArray) {
      await sql.begin(async sql => {
        await sql`DELETE FROM activity_defaults WHERE activity_id = ${id}`;
        for (const d of body.defaults as Array<{ default_time: string; default_duration?: number; days_of_week?: string | null }>) {
          if (d.default_time) {
            await sql`
              INSERT INTO activity_defaults (activity_id, default_time, default_duration, days_of_week)
              VALUES (${id}, ${d.default_time}, ${d.default_duration ?? 30}, ${d.days_of_week ?? null})
            `;
          }
        }
      });
    } else if (hasLegacyDefault) {
      const existing = await sql`SELECT id FROM activity_defaults WHERE activity_id = ${id}`;
      const daysOfWeek = 'days_of_week' in body ? body.days_of_week ?? null : null;
      if (existing.length > 0) {
        await sql`
          UPDATE activity_defaults
          SET default_time = ${body.default_time}, default_duration = ${body.default_duration ?? 30}, days_of_week = ${daysOfWeek}
          WHERE activity_id = ${id}
        `;
      } else {
        await sql`
          INSERT INTO activity_defaults (activity_id, default_time, default_duration, days_of_week)
          VALUES (${id}, ${body.default_time}, ${body.default_duration ?? 30}, ${daysOfWeek})
        `;
      }
    }

    const [activity] = await sql`SELECT * FROM activities WHERE id = ${id}`;
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(activity);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const owned = await sql`SELECT id FROM activities WHERE id = ${id} AND user_id = ${userId}`;
    if (owned.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await sql.begin(async sql => {
      await sql`DELETE FROM activity_defaults WHERE activity_id = ${id}`;
      await sql`DELETE FROM activity_sub_activities WHERE activity_id = ${id}`;
      await sql`DELETE FROM activities WHERE id = ${id}`;
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update `app/api/activities/[id]/sub-activities/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    // Verify activity belongs to user
    const activity = await sql`SELECT id FROM activities WHERE id = ${Number(params.id)} AND user_id = ${userId}`;
    if (activity.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const subs = await sql`
      SELECT * FROM activity_sub_activities
      WHERE activity_id = ${Number(params.id)} AND is_active = 1
      ORDER BY label
    `;
    return NextResponse.json(subs);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const activityId = Number(params.id);
    const activity = await sql`SELECT id FROM activities WHERE id = ${activityId} AND user_id = ${userId} AND is_archived = 0`;
    if (activity.length === 0) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    const { label } = await req.json();
    if (!label?.trim()) return NextResponse.json({ error: 'label is required' }, { status: 400 });
    const result = await sql`
      SELECT COALESCE(MAX(sort_order), -1) as m FROM activity_sub_activities WHERE activity_id = ${activityId}
    `;
    const m = result[0].m;
    const [sub] = await sql`
      INSERT INTO activity_sub_activities (activity_id, label, sort_order)
      VALUES (${activityId}, ${label.trim()}, ${Number(m) + 1})
      RETURNING *
    `;
    return NextResponse.json(sub, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/api/activities/route.ts app/api/activities/[id]/route.ts app/api/activities/[id]/sub-activities/route.ts
git commit -m "feat: scope activities API routes to authenticated user"
```

---

## Task 9: Update schedule API route

**Files:**
- Modify: `app/api/schedule/route.ts`

- [ ] **Step 1: Replace `app/api/schedule/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getWeekStart } from '@/lib/utils';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function attachSubActivities(entries: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  if (entries.length === 0) return entries;
  const ids = entries.map(e => e.id as number);
  const subs = await sql`
    SELECT * FROM schedule_entry_sub_activities WHERE entry_id = ANY(${ids}) ORDER BY id
  `;
  const byEntry: Record<number, unknown[]> = {};
  for (const s of subs as unknown as Array<{ entry_id: number }>) {
    (byEntry[s.entry_id] ??= []).push(s);
  }
  return entries.map(e => ({ ...e, entry_sub_activities: byEntry[e.id as number] ?? [] }));
}

export async function GET(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let entries: Record<string, unknown>[];

    if (date) {
      const countResult = await sql`
        SELECT COUNT(*) as c FROM schedule_entries WHERE date = ${date} AND removed = 0 AND user_id = ${userId}
      `;
      if (Number(countResult[0].c) === 0) {
        const dayOfWeek = new Date(date + 'T12:00:00').getDay();
        const allDefaults = await sql`
          SELECT a.id as activity_id, ad.default_time, ad.default_duration, ad.days_of_week
          FROM activities a
          JOIN activity_defaults ad ON a.id = ad.activity_id
          WHERE a.is_default = 1 AND a.is_archived = 0 AND a.user_id = ${userId}
          ORDER BY ad.default_time
        `;
        const defaults = (allDefaults as unknown as Array<{ activity_id: number; default_time: string; default_duration: number; days_of_week: string | null }>).filter(d => {
          if (!d.days_of_week) return true;
          return d.days_of_week.split(',').map(Number).includes(dayOfWeek);
        });
        if (defaults.length > 0) {
          const weekStart = getWeekStart(new Date(date + 'T12:00:00'));
          await sql.begin(async sql => {
            for (const d of defaults) {
              await sql`
                INSERT INTO schedule_entries (user_id, activity_id, date, time_slot, duration_minutes)
                VALUES (${userId}, ${d.activity_id}, ${date}, ${d.default_time}, ${d.default_duration})
              `;
              await sql`
                INSERT INTO activity_usage_log (user_id, activity_id, week_start, times_scheduled)
                VALUES (${userId}, ${d.activity_id}, ${weekStart}, 1)
                ON CONFLICT(user_id, activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
              `;
            }
          });
        }
      }

      entries = await sql`
        SELECT se.*, a.name as activity_name, a.category, a.color
        FROM schedule_entries se
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE se.date = ${date} AND se.removed = 0 AND se.user_id = ${userId}
        ORDER BY se.time_slot
      ` as Record<string, unknown>[];
    } else if (startDate && endDate) {
      const existing = await sql`
        SELECT DISTINCT date FROM schedule_entries
        WHERE date >= ${startDate} AND date <= ${endDate} AND removed = 0 AND user_id = ${userId}
      `;
      const existingDates = new Set((existing as unknown as Array<{ date: string | Date }>).map(r =>
        typeof r.date === 'string' ? r.date : r.date.toISOString().split('T')[0]
      ));

      const allDefaults = await sql`
        SELECT a.id as activity_id, ad.default_time, ad.default_duration, ad.days_of_week
        FROM activities a
        JOIN activity_defaults ad ON a.id = ad.activity_id
        WHERE a.is_default = 1 AND a.is_archived = 0 AND a.user_id = ${userId}
        ORDER BY ad.default_time
      ` as unknown as Array<{ activity_id: number; default_time: string; default_duration: number; days_of_week: string | null }>;

      if (allDefaults.length > 0) {
        const datesToPopulate: string[] = [];
        const cur = new Date(startDate + 'T12:00:00');
        const end = new Date(endDate + 'T12:00:00');
        while (cur <= end) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          if (!existingDates.has(dateStr)) datesToPopulate.push(dateStr);
          cur.setDate(cur.getDate() + 1);
        }

        if (datesToPopulate.length > 0) {
          await sql.begin(async sql => {
            for (const dateStr of datesToPopulate) {
              const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
              const dayDefaults = allDefaults.filter(d =>
                !d.days_of_week || d.days_of_week.split(',').map(Number).includes(dayOfWeek)
              );
              if (dayDefaults.length === 0) continue;
              const weekStart = getWeekStart(new Date(dateStr + 'T12:00:00'));
              for (const d of dayDefaults) {
                await sql`
                  INSERT INTO schedule_entries (user_id, activity_id, date, time_slot, duration_minutes)
                  VALUES (${userId}, ${d.activity_id}, ${dateStr}, ${d.default_time}, ${d.default_duration})
                `;
                await sql`
                  INSERT INTO activity_usage_log (user_id, activity_id, week_start, times_scheduled)
                  VALUES (${userId}, ${d.activity_id}, ${weekStart}, 1)
                  ON CONFLICT(user_id, activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
                `;
              }
            }
          });
        }
      }

      entries = await sql`
        SELECT se.*, a.name as activity_name, a.category, a.color
        FROM schedule_entries se
        LEFT JOIN activities a ON se.activity_id = a.id
        WHERE se.date >= ${startDate} AND se.date <= ${endDate} AND se.removed = 0 AND se.user_id = ${userId}
        ORDER BY se.date, se.time_slot
      ` as Record<string, unknown>[];
    } else {
      return NextResponse.json({ error: 'date or startDate+endDate required' }, { status: 400 });
    }

    return NextResponse.json(await attachSubActivities(entries));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
    await sql.begin(async sql => {
      await sql`
        DELETE FROM schedule_entry_sub_activities
        WHERE entry_id IN (SELECT id FROM schedule_entries WHERE date = ${date} AND user_id = ${userId})
      `;
      await sql`DELETE FROM schedule_entries WHERE date = ${date} AND user_id = ${userId}`;
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const { activity_id, date, time_slot, duration_minutes, notes, sub_activity_ids } = body;
    if (!date || !time_slot) return NextResponse.json({ error: 'date and time_slot required' }, { status: 400 });

    const [entry] = await sql`
      INSERT INTO schedule_entries (user_id, activity_id, date, time_slot, duration_minutes, notes)
      VALUES (${userId}, ${activity_id ?? null}, ${date}, ${time_slot}, ${duration_minutes ?? 30}, ${notes ?? null})
      RETURNING *
    `;

    if (activity_id) {
      const weekStart = getWeekStart(new Date(date + 'T12:00:00'));
      await sql`
        INSERT INTO activity_usage_log (user_id, activity_id, week_start, times_scheduled)
        VALUES (${userId}, ${activity_id}, ${weekStart}, 1)
        ON CONFLICT(user_id, activity_id, week_start) DO UPDATE SET times_scheduled = activity_usage_log.times_scheduled + 1
      `;
    }

    if (Array.isArray(sub_activity_ids) && sub_activity_ids.length > 0) {
      const entryId = entry.id as number;
      await sql.begin(async sql => {
        for (const subId of sub_activity_ids as number[]) {
          const labels = await sql`SELECT label FROM activity_sub_activities WHERE id = ${subId} AND is_active = 1`;
          if (labels.length > 0) {
            await sql`
              INSERT INTO schedule_entry_sub_activities (entry_id, sub_activity_id, label, completed)
              VALUES (${entryId}, ${subId}, ${(labels[0] as { label: string }).label}, 0)
            `;
          }
        }
      });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/schedule/route.ts
git commit -m "feat: scope schedule API route to authenticated user"
```

---

## Task 10: Update goals and responses API routes

**Files:**
- Modify: `app/api/goals/route.ts`
- Modify: `app/api/goals/[id]/route.ts`
- Modify: `app/api/responses/route.ts`

- [ ] **Step 1: Update `app/api/goals/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const goals = await sql`SELECT * FROM goals WHERE user_id = ${userId} ORDER BY name`;
    const subcats = await sql`
      SELECT gs.* FROM goal_subcategories gs
      JOIN goals g ON gs.goal_id = g.id
      WHERE gs.is_active = 1 AND g.user_id = ${userId}
      ORDER BY gs.goal_id, gs.label
    `;
    const result = (goals as unknown as Array<{ id: number } & Record<string, unknown>>).map(g => ({
      ...g,
      subcategories: (subcats as unknown as Array<{ goal_id: number } & Record<string, unknown>>).filter(s => s.goal_id === g.id),
    }));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const { name, description, color, subcategories } = body;
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const maxResult = await sql`SELECT COALESCE(MAX(sort_order), -1) as m FROM goals WHERE user_id = ${userId}`;
    const m = maxResult[0].m;

    const [goal] = await sql`
      INSERT INTO goals (user_id, name, description, color, sort_order)
      VALUES (${userId}, ${name}, ${description ?? null}, ${color ?? '#0EA5E9'}, ${Number(m) + 1})
      RETURNING *
    `;

    if (Array.isArray(subcategories)) {
      for (let i = 0; i < subcategories.length; i++) {
        const s = subcategories[i];
        await sql`
          INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order)
          VALUES (${goal.id}, ${s.response_type}, ${s.label}, ${s.sort_order ?? i})
        `;
      }
    }

    const subs = await sql`SELECT * FROM goal_subcategories WHERE goal_id = ${goal.id}`;
    return NextResponse.json({ ...goal, subcategories: subs }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `app/api/goals/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const id = Number(params.id);
    const rows = await sql`SELECT * FROM goals WHERE id = ${id} AND user_id = ${userId}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const subcats = await sql`SELECT * FROM goal_subcategories WHERE goal_id = ${id} ORDER BY label`;
    return NextResponse.json({ ...rows[0], subcategories: subcats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const id = Number(params.id);

    const owned = await sql`SELECT id FROM goals WHERE id = ${id} AND user_id = ${userId}`;
    if (owned.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = ['name', 'description', 'color', 'is_active', 'sort_order'];
    const updates = Object.fromEntries(allowed.filter(f => f in body).map(f => [f, body[f]]));
    if (Object.keys(updates).length > 0) {
      await sql`UPDATE goals SET ${sql(updates)} WHERE id = ${id} AND user_id = ${userId}`;
    }

    if (Array.isArray(body.subcategories)) {
      await sql.begin(async sql => {
        for (const s of body.subcategories) {
          if (s.id) {
            await sql`
              INSERT INTO goal_subcategories (id, goal_id, response_type, label, sort_order, is_active)
              VALUES (${s.id}, ${id}, ${s.response_type}, ${s.label}, ${s.sort_order ?? 0}, ${s.is_active ?? 1})
              ON CONFLICT(id) DO UPDATE SET
                label = EXCLUDED.label,
                sort_order = EXCLUDED.sort_order,
                is_active = EXCLUDED.is_active
            `;
          } else {
            await sql`
              INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order)
              VALUES (${id}, ${s.response_type}, ${s.label}, ${s.sort_order ?? 0})
            `;
          }
        }
      });
    }

    const [goal] = await sql`SELECT * FROM goals WHERE id = ${id}`;
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const subcats = await sql`SELECT * FROM goal_subcategories WHERE goal_id = ${id} ORDER BY label`;
    return NextResponse.json({ ...goal, subcategories: subcats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    await sql`UPDATE goals SET is_active = 0 WHERE id = ${Number(params.id)} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update `app/api/responses/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const goalId = searchParams.get('goalId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = date ? sql`AND gr.date = ${date}` : sql``;
    const startFilter = startDate ? sql`AND gr.date >= ${startDate}` : sql``;
    const endFilter = endDate ? sql`AND gr.date <= ${endDate}` : sql``;
    const goalFilter = goalId ? sql`AND gr.goal_id = ${Number(goalId)}` : sql``;

    const rows = await sql`
      SELECT gr.*, gs.label as subcategory_label, g.name as goal_name, g.color as goal_color
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      LEFT JOIN goals g ON gr.goal_id = g.id
      WHERE gr.user_id = ${userId}
      ${dateFilter} ${startFilter} ${endFilter} ${goalFilter}
      ORDER BY gr.timestamp DESC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const body = await req.json();
    const { goal_id, subcategory_id, response_type, date, session_notes } = body;
    if (!goal_id || !response_type || !date) {
      return NextResponse.json({ error: 'goal_id, response_type, date required' }, { status: 400 });
    }

    // Verify goal belongs to user
    const owned = await sql`SELECT id FROM goals WHERE id = ${goal_id} AND user_id = ${userId}`;
    if (owned.length === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const [inserted] = await sql`
      INSERT INTO goal_responses (user_id, goal_id, subcategory_id, response_type, date, session_notes)
      VALUES (${userId}, ${goal_id}, ${subcategory_id ?? null}, ${response_type}, ${date}, ${session_notes ?? null})
      RETURNING id
    `;
    const [row] = await sql`
      SELECT gr.*, gs.label as subcategory_label
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      WHERE gr.id = ${inserted.id}
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/api/goals/route.ts app/api/goals/[id]/route.ts app/api/responses/route.ts
git commit -m "feat: scope goals and responses API routes to authenticated user"
```

---

## Task 11: Update analytics and settings API routes

**Files:**
- Modify: `app/api/analytics/route.ts`
- Modify: `app/api/settings/route.ts`

- [ ] **Step 1: Update `app/api/analytics/route.ts`**

Add `requireUser()` at top, then add `AND gr.user_id = ${userId}` to all three queries that reference `goal_responses`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { format, subDays, parseISO } from 'date-fns';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');
    const days = Number(searchParams.get('days') ?? 7);
    const goalId = searchParams.get('goalId');

    const startDate = format(subDays(parseISO(date), days - 1), 'yyyy-MM-dd');
    const goalFilter = goalId ? sql`AND goal_id = ${Number(goalId)}` : sql``;
    const subcatGoalFilter = goalId ? sql`AND gr.goal_id = ${Number(goalId)}` : sql``;

    const trend = await sql`
      SELECT date,
        COUNT(*) as total,
        SUM(CASE WHEN response_type='correct' THEN 1 ELSE 0 END) as correct
      FROM goal_responses
      WHERE user_id = ${userId} AND date >= ${startDate} AND date <= ${date}
      ${goalFilter}
      GROUP BY date
      ORDER BY date
    `;

    const [todaySummary] = await sql`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN response_type='correct' THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN response_type='incorrect' THEN 1 ELSE 0 END) as incorrect
      FROM goal_responses WHERE user_id = ${userId} AND date = ${date}
    `;

    const goalSummary = await sql`
      SELECT gr.goal_id, g.name, g.color,
        COUNT(*) as total,
        SUM(CASE WHEN gr.response_type='correct' THEN 1 ELSE 0 END) as correct
      FROM goal_responses gr
      JOIN goals g ON gr.goal_id = g.id
      WHERE gr.user_id = ${userId} AND gr.date = ${date}
      GROUP BY gr.goal_id, g.name, g.color
      ORDER BY g.name
    `;

    const subcatBreakdown = await sql`
      SELECT gr.subcategory_id, gs.label, gr.response_type, COUNT(*) as count, gr.goal_id
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      WHERE gr.user_id = ${userId} AND gr.date >= ${startDate} AND gr.date <= ${date}
      ${subcatGoalFilter}
      GROUP BY gr.subcategory_id, gs.label, gr.response_type, gr.goal_id
      ORDER BY gs.label, count DESC
    `;

    const thisWeekStart = format(subDays(parseISO(date), 6), 'yyyy-MM-dd');
    const lastWeekStart = format(subDays(parseISO(thisWeekStart), 7), 'yyyy-MM-dd');

    const [weekCompare] = await sql`
      SELECT
        SUM(CASE WHEN date >= ${thisWeekStart} THEN (CASE WHEN response_type='correct' THEN 1 ELSE 0 END) ELSE 0 END) as this_correct,
        SUM(CASE WHEN date >= ${thisWeekStart} THEN 1 ELSE 0 END) as this_total,
        SUM(CASE WHEN date < ${thisWeekStart} THEN (CASE WHEN response_type='correct' THEN 1 ELSE 0 END) ELSE 0 END) as last_correct,
        SUM(CASE WHEN date < ${thisWeekStart} THEN 1 ELSE 0 END) as last_total
      FROM goal_responses
      WHERE user_id = ${userId} AND date >= ${lastWeekStart} AND date <= ${date}
    `;

    return NextResponse.json({
      date,
      todaySummary,
      goalSummary,
      trend: (trend as unknown as Array<{ date: string; total: string; correct: string }>).map(t => ({
        ...t,
        total: Number(t.total),
        correct: Number(t.correct),
        accuracy: Number(t.total) > 0 ? Math.round((Number(t.correct) / Number(t.total)) * 100) : 0,
      })),
      subcatBreakdown,
      weekCompare,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `app/api/settings/route.ts`**

```ts
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
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/api/analytics/route.ts app/api/settings/route.ts
git commit -m "feat: scope analytics and settings API routes to authenticated user"
```

---

## Task 12: Push branch and create Vercel preview deployment

- [ ] **Step 1: Push the branch**

```bash
git push origin feature/multi-user
```

- [ ] **Step 2: Add env vars to Vercel preview**

In Vercel Dashboard → Project Settings → Environment Variables, add (scoped to **Preview** branch `feature/multi-user`):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=your-existing-database-url
```

- [ ] **Step 3: Run migration in Supabase**

If not already done in Task 4 Step 2, run `lib/migration-add-user-id.sql` in Supabase SQL Editor now.

- [ ] **Step 4: Test the flow**

1. Open the preview URL → should redirect to `/login`
2. Click "Sign up" → create an account with your email
3. Check email for confirmation link (or disable email confirmation in Supabase Dashboard → Auth → Providers → Email → disable "Confirm email")
4. Sign in → should land on `/scheduler`
5. Create some activities, schedule entries, goals
6. Sign out → confirm redirect to `/login`
7. Sign in as a different account → confirm no data from first account is visible

---

## Notes for deployment to production (main branch)

When ready to merge to main:
1. Run the migration SQL on the production database (same Supabase project, same SQL)
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel Production env vars
3. Merge `feature/multi-user` → `main` via pull request
4. Existing data (before migration) will have `null` user_id and will not be visible to any user — it can be deleted from the database after migrating

---

*Plan saved: 2026-04-07*
