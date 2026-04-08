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
