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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      router.push('/scheduler');
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border p-10 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            We sent a confirmation link to <strong className="text-gray-700">{email}</strong>. Click it to activate your account.
          </p>
          <a
            href="/login"
            className="inline-block mt-6 text-sm text-red-600 hover:text-red-700 font-semibold"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
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
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1">Get started with Horizons of Hope</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1.5">Minimum 6 characters</p>
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account?{' '}
            <a href="/login" className="text-red-600 hover:text-red-700 font-semibold">
              Sign in
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
