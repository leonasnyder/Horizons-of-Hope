import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getWeekStart(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

export function getWeekDates(weekStart: string): Date[] {
  const start = parseISO(weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function computeStreak(usageLog: string[], currentWeekStart: string): number {
  let streak = 0;
  let expectedWeek = currentWeekStart;
  for (const week of usageLog) {
    if (week === expectedWeek) {
      streak++;
      const d = parseISO(expectedWeek);
      d.setDate(d.getDate() - 7);
      expectedWeek = format(d, 'yyyy-MM-dd');
    } else {
      break;
    }
  }
  return streak;
}

export function generateTimeSlots(startHour = 7, endHour = 18, intervalMin = 30): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMin) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function accuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
