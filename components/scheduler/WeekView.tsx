'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { format, parseISO, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Printer, Loader2, RefreshCw } from 'lucide-react';
import { getWeekStart, getWeekDates, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import PrintWeekView from './PrintWeekView';
import { ExportWeekDocButton } from '@/components/shared/ExportButtons';

interface ScheduleEntry {
  id: number;
  time_slot: string;
  duration_minutes: number;
  activity_name: string;
  category: string | null;
  color: string;
  date: string;
  is_completed: number;
}

function endTime(timeSlot: string, durationMinutes: number): string {
  const [h, m] = timeSlot.slice(0, 5).split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  const period = eh >= 12 ? 'PM' : 'AM';
  const hour = eh % 12 || 12;
  return `${hour}:${String(em).padStart(2, '0')} ${period}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(249,115,22,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

interface WeekViewProps {
  selectedDate: string;
  refreshKey?: number;
  onSelectDay: (date: string) => void;
}

export default function WeekView({ selectedDate, refreshKey, onSelectDay }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(parseISO(selectedDate)));
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const days = getWeekDates(weekStart);
  const endDate = format(days[6], 'yyyy-MM-dd');

  const fetchWeek = useCallback(() => {
    setLoading(true);
    fetch(`/api/schedule?startDate=${weekStart}&endDate=${endDate}`)
      .then(r => r.json())
      .then(data => { setEntries(Array.isArray(data) ? data : []); })
      .catch(() => toast.error('Failed to load week'))
      .finally(() => setLoading(false));
  }, [weekStart, endDate]);

  useEffect(() => { fetchWeek(); }, [fetchWeek, refreshKey]);

  const [resettingWeek, setResettingWeek] = useState(false);

  const resetDay = async (dateStr: string) => {
    if (!window.confirm(`Reset ${format(parseISO(dateStr), 'EEEE')} to default activities?`)) return;
    try {
      const res = await fetch(`/api/schedule?date=${dateStr}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      fetchWeek();
      toast.success('Day reset to defaults');
    } catch {
      toast.error('Failed to reset day');
    }
  };

  const resetWeek = async () => {
    if (!window.confirm(`Reset all 7 days this week to default activities? This will clear any custom changes you've made.`)) return;
    setResettingWeek(true);
    try {
      await Promise.all(
        days.map(day =>
          fetch(`/api/schedule?date=${format(day, 'yyyy-MM-dd')}`, { method: 'DELETE' })
        )
      );
      fetchWeek();
      toast.success('Whole week reset to defaults');
    } catch {
      toast.error('Failed to reset week');
    } finally {
      setResettingWeek(false);
    }
  };

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
        <Button
          id="week-view-reset"
          variant="outline"
          size="sm"
          onClick={resetWeek}
          disabled={resettingWeek}
          title="Reset all days this week to default activities"
        >
          {resettingWeek
            ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Resetting...</>
            : <><RefreshCw className="h-4 w-4 mr-1" /> Reset Week</>
          }
        </Button>
        <Button id="week-view-print" variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Print Week
        </Button>
        <ExportWeekDocButton weekStart={weekStart} entriesByDate={entriesByDate} />
      </div>

      {loading ? (
        <div id="week-view-loading" className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : (
        <div id="week-view-grid" className="grid grid-cols-7 gap-1 overflow-x-auto">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate[dateStr] ?? [];
            const isSelected = dateStr === selectedDate;
            return (
              <div key={dateStr} id={`week-col-${dateStr}`} className="min-w-[100px]">
                <div className={`rounded-t-lg text-sm font-semibold transition-colors min-h-[52px] flex flex-col ${
                  isSelected ? 'bg-red-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}>
                  <button
                    id={`week-header-${dateStr}`}
                    onClick={() => onSelectDay(dateStr)}
                    className="flex-1 text-center py-2 hover:opacity-80 transition-opacity w-full"
                    aria-label={format(day, 'EEEE MMMM d')}
                    aria-pressed={isSelected}
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-xs opacity-75">{format(day, 'M/d')}</div>
                  </button>
                  <button
                    onClick={() => resetDay(dateStr)}
                    className={`flex items-center justify-center pb-1 opacity-40 hover:opacity-100 transition-opacity`}
                    aria-label={`Reset ${format(day, 'EEEE')} to defaults`}
                    title="Reset to defaults"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
                <div className="border border-t-0 rounded-b-lg p-1 min-h-[200px] bg-white dark:bg-gray-800 space-y-1">
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-gray-300 p-2 text-center">—</p>
                  ) : (
                    dayEntries.map(e => (
                      <button
                        key={e.id}
                        id={`week-entry-${e.id}`}
                        onClick={() => onSelectDay(dateStr)}
                        className={`w-full text-left text-xs p-1.5 rounded border transition-colors ${
                          e.is_completed ? 'opacity-50 line-through' : ''
                        }`}
                        style={{
                          backgroundColor: hexToRgba(e.color || '#F97316', 0.15),
                          borderColor: hexToRgba(e.color || '#F97316', 0.5),
                        }}
                        aria-label={`Edit ${e.activity_name} — go to ${format(day, 'EEEE')}`}
                      >
                        <span className="font-mono text-xs text-red-800 dark:text-red-400">
                          {formatTime(e.time_slot)}–{endTime(e.time_slot, e.duration_minutes)}
                        </span>
                        <br />
                        <span className="text-gray-700 dark:text-gray-300 leading-tight">{e.activity_name}</span>
                      </button>
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
