'use client';
import { Bell, X } from 'lucide-react';
import { formatAmPm, type ActivityReminder } from '@/lib/hooks/useActivityReminders';

interface ActivityReminderBannerProps {
  reminders: ActivityReminder[];
  onDismiss: (id: string) => void;
}

export default function ActivityReminderBanner({ reminders, onDismiss }: ActivityReminderBannerProps) {
  if (reminders.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {reminders.map(r => (
        <div
          key={r.id}
          className="flex items-start gap-3 bg-red-600 text-white rounded-xl shadow-lg px-4 py-3"
          role="alert"
        >
          <Bell className="h-5 w-5 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">{r.activity_name}</p>
            <p className="text-xs text-red-100 mt-0.5">
              Starting at {formatAmPm(r.time_slot)} — {r.offsetMinutes} min reminder
            </p>
          </div>
          <button
            onClick={() => onDismiss(r.id)}
            className="p-1 rounded-lg hover:bg-red-500 flex-shrink-0"
            aria-label="Dismiss reminder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
