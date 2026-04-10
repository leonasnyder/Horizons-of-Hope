'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function formatAmPm(timeSlot: string): string {
  const [h, m] = timeSlot.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export interface ActivityReminder {
  id: string;
  activity_name: string;
  time_slot: string;
  offsetMinutes: number;
}

export function useActivityReminders() {
  const [reminders, setReminders] = useState<ActivityReminder[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (typeof window === 'undefined') return;

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

          if (notifyAtSeconds <= nowTotalSeconds) continue;

          const msUntil = (notifyAtSeconds - nowTotalSeconds) * 1000;
          const reminderId = `${entry.id}-${entry.time_slot}`;

          const id = setTimeout(() => {
            // In-app banner
            setReminders(prev => [
              ...prev.filter(r => r.id !== reminderId),
              { id: reminderId, activity_name: entry.activity_name, time_slot: entry.time_slot, offsetMinutes },
            ]);

            // Play chime sound
            try {
              const ctx = new AudioContext();
              const gainNode = ctx.createGain();
              gainNode.connect(ctx.destination);
              gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
              [523, 659, 784].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                osc.connect(gainNode);
                osc.start(ctx.currentTime + i * 0.18);
                osc.stop(ctx.currentTime + i * 0.18 + 0.3);
              });
            } catch { /* ignore if audio not available */ }

            // Also try system notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`⏰ ${entry.activity_name}`, {
                  body: `Starting at ${formatAmPm(entry.time_slot)} — ${offsetMinutes} min reminder`,
                  icon: '/icons/icon-192.png',
                  silent: true,
                });
              } catch { /* ignore */ }
            }
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
  }, []);

  return { reminders, dismiss };
}
