'use client';
import { useState, useEffect, useRef } from 'react';
import { format, parseISO, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Printer, Loader2 } from 'lucide-react';
import { getWeekStart, getWeekDates, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import PrintWeekView from './PrintWeekView';
import { ExportWeekDocButton } from '@/components/shared/ExportButtons';

interface ScheduleEntry {
  id: number;
  time_slot: string;
  activity_name: string;
  category: string | null;
  date: string;
  is_completed: number;
}

interface WeekViewProps {
  selectedDate: string;
  onSelectDay: (date: string) => void;
}

export default function WeekView({ selectedDate, onSelectDay }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(parseISO(selectedDate)));
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const days = getWeekDates(weekStart);
  const endDate = format(days[6], 'yyyy-MM-dd');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/schedule?startDate=${weekStart}&endDate=${endDate}`)
      .then(r => r.json())
      .then(data => { setEntries(Array.isArray(data) ? data : []); })
      .catch(() => toast.error('Failed to load week'))
      .finally(() => setLoading(false));
  }, [weekStart, endDate]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Week-${weekStart}`,
  });

  const entriesByDate = entries.reduce<Record<string, ScheduleEntry[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div id="week-view">
      <div id="week-view-toolbar" className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            id="week-view-prev"
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(w => format(subWeeks(parseISO(w), 1), 'yyyy-MM-dd'))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm whitespace-nowrap">
            {format(parseISO(weekStart), 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
          </span>
          <Button
            id="week-view-next"
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(w => format(addWeeks(parseISO(w), 1), 'yyyy-MM-dd'))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button id="week-view-print" variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Print Week
        </Button>
        <ExportWeekDocButton weekStart={weekStart} entriesByDate={entriesByDate} />
      </div>

      {loading ? (
        <div id="week-view-loading" className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div id="week-view-grid" className="grid grid-cols-7 gap-1 overflow-x-auto">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate[dateStr] ?? [];
            const isSelected = dateStr === selectedDate;
            return (
              <div key={dateStr} id={`week-col-${dateStr}`} className="min-w-[100px]">
                <button
                  id={`week-header-${dateStr}`}
                  onClick={() => onSelectDay(dateStr)}
                  className={`w-full text-center py-2 rounded-t-lg text-sm font-semibold transition-colors min-h-[52px] ${
                    isSelected
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900 text-gray-700 dark:text-gray-300'
                  }`}
                  aria-label={format(day, 'EEEE MMMM d')}
                  aria-pressed={isSelected}
                >
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-xs opacity-75">{format(day, 'M/d')}</div>
                </button>
                <div className="border border-t-0 rounded-b-lg p-1 min-h-[200px] bg-white dark:bg-gray-800 space-y-1">
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-gray-300 p-2 text-center">—</p>
                  ) : (
                    dayEntries.map(e => (
                      <div
                        key={e.id}
                        id={`week-entry-${e.id}`}
                        className={`text-xs p-1.5 rounded bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 ${
                          e.is_completed ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <span className="font-mono text-orange-600 dark:text-orange-400 text-xs">{formatTime(e.time_slot)}</span>
                        <br />
                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{e.activity_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden print target */}
      <div className="hidden print:block">
        <PrintWeekView
          ref={printRef}
          weekStart={weekStart}
          entriesByDate={entriesByDate}
        />
      </div>
    </div>
  );
}
