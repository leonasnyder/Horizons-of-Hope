'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TopNav() {
  const pathname = usePathname();
  return (
    <header id="top-nav" className="sticky top-0 z-50 border-b bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between px-4 h-16 max-w-7xl mx-auto">
        <div id="top-nav-brand" className="flex items-center gap-2">
          <Sun className="h-6 w-6 text-orange-500" />
          <span
            className="text-xl font-bold bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent"
          >
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
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/settings"
          id="top-nav-settings"
          className={cn(
            'p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
            pathname === '/settings'
              ? 'bg-orange-500 text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          )}
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
