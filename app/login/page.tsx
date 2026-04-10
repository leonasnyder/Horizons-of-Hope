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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="lg:w-1/2 bg-red-600 flex flex-col items-center justify-center p-10 text-white min-h-[220px] lg:min-h-screen">
        <div className="max-w-sm text-center lg:text-left">
          <img
            src="/logo.png"
            alt="Horizons of Hope"
            className="h-20 w-auto object-contain mx-auto lg:mx-0 mb-6 drop-shadow-lg"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h1 className="text-3xl font-bold tracking-tight mb-3">Horizons of Hope</h1>
          <p className="text-red-100 text-base leading-relaxed">
            Daily activity scheduling and behavioral data tracking — built for care providers and their teams.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="lg:w-1/2 flex items-center justify-center bg-gray-50 p-6 flex-1">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow placeholder-gray-400"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <a href="/forgot-password" className="text-xs text-red-600 hover:text-red-700 font-medium">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow placeholder-gray-400"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="text-red-600 hover:text-red-700 font-semibold">
              Create one
            </a>
          </p>

          <p className="text-xs text-gray-400 mt-8 text-center">
            &copy; {new Date().getFullYear()} Horizons of Hope. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
