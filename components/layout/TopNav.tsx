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
