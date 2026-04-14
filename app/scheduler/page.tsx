'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import DatePicker from '@/components/shared/DatePicker';
import CalendarWidget from '@/components/shared/CalendarWidget';
import DayView from '@/components/scheduler/DayView';
import WeekView from '@/components/scheduler/WeekView';
import ActivityManager from '@/components/scheduler/ActivityManager';
import DayNotes from '@/components/scheduler/DayNotes';
import { Button } from '@/components/ui/button';
import { CalendarDays, Calendar, Settings2, RefreshCw, Clock, RotateCcw } from 'lucide-react';
import { useActivityReminders } from '@/lib/hooks/useActivityReminders';
import ActivityReminderBanner from '@/components/scheduler/ActivityReminderBanner';
import { usePullToRefresh, PULL_THRESHOLD } from '@/lib/hooks/usePullToRefresh';

type ViewMode = 'day' | 'week';

function fmtSecs(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function fmtDur(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SchedulerPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [activityManagerOpen, setActivityManagerOpen] = useState(false);
  const [weekRefreshKey, setWeekRefreshKey] = useState(0);
  const [dayRefreshKey, setDayRefreshKey] = useState(0);
  const handleDayReset = useCallback(() => setWeekRefreshKey(k => k + 1), []);

  // --- Stopwatch ---
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [timerLabel, setTimerLabel] = useState('');
  const [splits, setSplits] = useState<{label: string; dur: number}[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const baseRef = useRef(0);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000) + baseRef.current);
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const timerStart = () => { baseRef.current = elapsed; setRunning(true); };
  const timerStop = () => {
    setRunning(false);
    const final = Math.floor((Date.now() - startRef.current) / 1000) + baseRef.current;
    setElapsed(final);
    baseRef.current = final;
    if (final > 0) setSplits(p => [{label: timerLabel.trim() || 'Activity', dur: final}, ...p.slice(0,4)]);
  };
  const timerReset = () => { setRunning(false); setElapsed(0); baseRef.current = 0; setTimerLabel(''); setSplits([]); };

  const handlePullRefresh = useCallback(() => {
    if (viewMode === 'day') setDayRefreshKey(k => k + 1);
    else setWeekRefreshKey(k => k + 1);
  }, [viewMode]);

  const { pullDistance } = usePullToRefresh(handlePullRefresh);
  const { reminders, dismiss } = useActivityReminders();

  return (
    <div id="scheduler-page" className="max-w-7xl mx-auto p-4">
      {/* Pull-to-refresh indicator — always mounted, height animates with pull */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: `${pullDistance}px` }}
      >
        <div className={`flex flex-col items-center gap-1 ${pullDistance >= PULL_THRESHOLD ? 'text-red-600' : 'text-gray-400'}`}>
          <RefreshCw
            className="h-6 w-6 transition-colors duration-150"
            style={{ transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)` }}
          />
          <span className="text-xs font-medium">
            {pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>
      <ActivityReminderBanner reminders={reminders} onDismiss={dismiss} />
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div id="scheduler-sidebar" className="lg:w-64 flex-shrink-0 space-y-4">
          <CalendarWidget
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setViewMode('day');
            }}
          />

          {/* Stopwatch */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <Clock className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stopwatch</span>
            </div>
            <div className="p-3 space-y-3 bg-white dark:bg-gray-900">
              <input
                type="text"
                value={timerLabel}
                onChange={e => setTimerLabel(e.target.value)}
                placeholder="Activity name (optional)"
                disabled={running}
                className="w-full text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
              />
              <div className={`text-center font-mono text-3xl font-bold ${running ? 'text-red-600' : elapsed > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                {fmtSecs(elapsed)}
              </div>
              <div className="flex gap-2">
                {!running ? (
                  <button onClick={timerStart} className="flex-1 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
                    {elapsed > 0 ? '▶ Resume' : '▶ Start'}
                  </button>
                ) : (
                  <button onClick={timerStop} className="flex-1 py-2 rounded-md bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
                    ■ Stop
                  </button>
                )}
                <button
                  onClick={timerReset}
                  disabled={elapsed === 0 && !running}
                  title="Reset"
                  className="p-2 rounded-md border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              {splits.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Recent</p>
                  {splits.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400 truncate flex-1 mr-2">{s.label}</span>
                      <span className="font-mono text-gray-700 dark:text-gray-300 flex-shrink-0">{fmtDur(s.dur)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            id="scheduler-manage-activities"
            variant="outline"
            className="w-full"
            onClick={() => setActivityManagerOpen(true)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Activities
          </Button>
        </div>

        {/* Main Content */}
        <div id="scheduler-main" className="flex-1 min-w-0">
          <div id="scheduler-header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <DatePicker date={selectedDate} onChange={setSelectedDate} />

            <div id="scheduler-view-toggle" className="flex rounded-lg border overflow-hidden">
              <button
                id="scheduler-day-view-btn"
                onClick={() => setViewMode('day')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                  viewMode === 'day'
                    ? 'bg-red-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-4 w-4" /> Day
              </button>
              <button
                id="scheduler-week-view-btn"
                onClick={() => { setViewMode('week'); setWeekRefreshKey(k => k + 1); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                  viewMode === 'week'
                    ? 'bg-red-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                <CalendarDays className="h-4 w-4" /> Week
              </button>
            </div>
          </div>

          {viewMode === 'day' ? (
            <DayView date={selectedDate} refreshKey={dayRefreshKey} onReset={handleDayReset} />
          ) : (
            <WeekView
              selectedDate={selectedDate}
              refreshKey={weekRefreshKey}
              onSelectDay={(date) => {
                setSelectedDate(date);
                setViewMode('day');
              }}
            />
          )}

          {/* Day Notes — shown in day view only */}
          {viewMode === 'day' && (
            <div className="mt-4">
              <DayNotes date={selectedDate} />
            </div>
          )}
        </div>
      </div>

      <ActivityManager
        open={activityManagerOpen}
        onClose={() => setActivityManagerOpen(false)}
      />
    </div>
  );
}
