'use client';
import { useState, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, addDays,
  isSameMonth, isSameDay, parseISO, addMonths, subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarWidgetProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export default function CalendarWidget({ selectedDate, onSelectDate }: CalendarWidgetProps) {
  const [viewMonth, setViewMonth] = useState(() => parseISO(selectedDate));
  const [activeDates, setActiveDates] = useState<string[]>([]);

  useEffect(() => {
    const month = format(viewMonth, 'yyyy-MM');
    fetch(`/api/schedule/active-dates?month=${month}`)
      .then(r => r.json())
      .then((data) => { if (Array.isArray(data)) setActiveDates(data); })
      .catch(() => {});
  }, [viewMonth]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = startDate;
  while (d <= monthEnd || days.length % 7 !== 0) {
    days.push(d);
    d = addDays(d, 1);
    if (days.length > 42) break;
  }

  const selected = parseISO(selectedDate);

  return (
    <div id="calendar-widget" className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
      <div id="calendar-widget-header" className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">{format(viewMonth, 'MMMM yyyy')}</span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div id="calendar-widget-grid" className="grid grid-cols-7 gap-px text-center">
        {['M','T','W','T','F','S','S'].map((dayLabel, i) => (
          <div key={i} className="text-xs text-gray-400 py-1">{dayLabel}</div>
        ))}
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = isSameDay(day, selected);
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const hasActivity = activeDates.includes(dateStr);
          return (
            <button
              key={i}
              id={`calendar-day-${dateStr}`}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'relative w-8 h-8 mx-auto rounded-full text-xs transition-colors flex items-center justify-center',
                isSelected && 'bg-orange-500 text-white font-bold',
                !isSelected && isCurrentMonth && 'hover:bg-orange-100 dark:hover:bg-orange-900',
                !isCurrentMonth && 'text-gray-300 dark:text-gray-600'
              )}
              aria-label={format(day, 'MMMM d, yyyy')}
              aria-pressed={isSelected}
            >
              {format(day, 'd')}
              {hasActivity && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
