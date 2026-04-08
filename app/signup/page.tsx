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
