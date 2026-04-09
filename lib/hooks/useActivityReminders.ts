'use client';
import { useEffect, useRef } from 'react';
import { format } from 'date-fns';

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatAmPm(timeSlot: string): string {
  const [h, m] = timeSlot.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function useActivityReminders() {
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear any previous timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const today = format(new Date(), 'yyyy-MM-dd');

    async function schedule() {
      try {
        const [settingsRes, scheduleRes] = await Promise.all([
          fetch('/api/settings'),
          fetch(`/api/schedule?date=${today}`),
        ]);

        const settings = await settingsRes.json();
        if (settings.notifications_enabled !== 'true') return;

        const offsetMinutes = Math.max(1, Number(settings.notification_offset) || 10);
        const entries = await scheduleRes.json();
        if (!Array.isArray(entries)) return;

        const now = new Date();
        const nowTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

        for (const entry of entries) {
          const activityMin = timeToMinutes(entry.time_slot);
          const notifyAtMin = activityMin - offsetMinutes;
          const notifyAtSeconds = notifyAtMin * 60;

          if (notifyAtSeconds <= nowTotalSeconds) continue; // already passed

          const msUntil = (notifyAtSeconds - nowTotalSeconds) * 1000;

          const id = setTimeout(() => {
            new Notification(`⏰ ${entry.activity_name}`, {
              body: `Starting at ${formatAmPm(entry.time_slot)} — ${offsetMinutes} min reminder`,
              icon: '/icons/icon-192.png',
              silent: false,
            });
          }, msUntil);

          timeoutsRef.current.push(id);
        }
      } catch (e) {
        console.warn('[ActivityReminders] Failed to schedule reminders:', e);
      }
    }

    schedule();

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []); // Schedule once when the scheduler page mounts
}
