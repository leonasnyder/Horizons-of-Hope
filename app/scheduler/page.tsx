'use client';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import DatePicker from '@/components/shared/DatePicker';
import CalendarWidget from '@/components/shared/CalendarWidget';
import DayView from '@/components/scheduler/DayView';
import WeekView from '@/components/scheduler/WeekView';
import ActivityManager from '@/components/scheduler/ActivityManager';
import { Button } from '@/components/ui/button';
import { CalendarDays, Calendar, Settings2 } from 'lucide-react';
import { useActivityReminders } from '@/lib/hooks/useActivityReminders';
import ActivityReminderBanner from '@/components/scheduler/ActivityReminderBanner';

type ViewMode = 'day' | 'week';

export default function SchedulerPage() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [activityManagerOpen, setActivityManagerOpen] = useState(false);
  const [weekRefreshKey, setWeekRefreshKey] = useState(0);
  const handleDayReset = useCallback(() => setWeekRefreshKey(k => k + 1), []);
  const { reminders, dismiss } = useActivityReminders();

  return (
    <div id="scheduler-page" className="max-w-7xl mx-auto p-4">
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
                onClick={() => setViewMode('week')}
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
            <DayView date={selectedDate} onReset={handleDayReset} />
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
        </div>
      </div>

      <ActivityManager
        open={activityManagerOpen}
        onClose={() => setActivityManagerOpen(false)}
      />
    </div>
  );
}
