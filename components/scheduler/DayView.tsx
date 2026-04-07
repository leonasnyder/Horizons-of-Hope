'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus, Printer, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import ActivityCard from './ActivityCard';
import type { EntrySubActivity } from './ActivityCard';
import EditEntryModal from './EditEntryModal';
import AddActivityModal from './AddActivityModal';
import PrintDayView from './PrintDayView';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { ExportDayDocButton } from '@/components/shared/ExportButtons';

interface ScheduleEntry {
  id: number;
  activity_id: number;
  time_slot: string;
  duration_minutes: number;
  notes: string | null;
  is_completed: number;
  activity_name: string;
  category: string | null;
  color: string;
  entry_sub_activities: EntrySubActivity[];
}

interface DayViewProps {
  date: string;
}

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 20;
const SLOT_INTERVAL_MIN = 15;
const SLOT_HEIGHT_PX = 24; // px per 15-minute slot

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToSlot(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  // Snap to nearest 15-min interval
  const snappedM = Math.round(m / 15) * 15;
  const snappedH = h + Math.floor(snappedM / 60);
  const finalM = snappedM % 60;
  return `${String(snappedH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

const DAY_START_MIN = DAY_START_HOUR * 60;
const DAY_END_MIN = DAY_END_HOUR * 60;
const TOTAL_SLOTS = (DAY_END_MIN - DAY_START_MIN) / SLOT_INTERVAL_MIN;
const TIMELINE_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT_PX;

export default function DayView({ date }: DayViewProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [addingToSlot, setAddingToSlot] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?date=${date}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleUpdate = useCallback(async (id: number, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/schedule/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      await fetchEntries();
    } catch {
      toast.error('Failed to update activity');
    }
  }, [fetchEntries]);

  const handleRemove = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Activity removed from today');
      await fetchEntries();
    } catch {
      toast.error('Failed to remove activity');
    }
  }, [fetchEntries]);

  const handleToggleSubActivity = useCallback(async (entryId: number, entrySubActivityId: number, completed: number) => {
    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, entry_sub_activities: e.entry_sub_activities.map(s => s.id === entrySubActivityId ? { ...s, completed } : s) }
        : e
    ));
    try {
      const res = await fetch(`/api/schedule/${entryId}/sub-activities`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_sub_activity_id: entrySubActivityId, completed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setEntries(prev => prev.map(e =>
        e.id === entryId
          ? { ...e, entry_sub_activities: e.entry_sub_activities.map(s => s.id === entrySubActivityId ? { ...s, completed: completed ? 0 : 1 } : s) }
          : e
      ));
      toast.error('Failed to update sub-activity');
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex(e => e.id === active.id);
    const newIndex = entries.findIndex(e => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const draggedEntry = entries[oldIndex];
    const targetEntry = entries[newIndex];

    const newEntries = arrayMove(entries, oldIndex, newIndex);
    setEntries(newEntries);

    try {
      await Promise.all([
        fetch(`/api/schedule/${draggedEntry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ time_slot: targetEntry.time_slot }),
        }),
        fetch(`/api/schedule/${targetEntry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ time_slot: draggedEntry.time_slot }),
        }),
      ]);
      await fetchEntries();
    } catch {
      toast.error('Failed to reorder');
      await fetchEntries();
    }
  }, [entries, fetchEntries]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    // Don't open modal if clicking on an existing activity card
    if ((e.target as HTMLElement).closest('[data-activity-card]')) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + timelineRef.current.scrollTop;
    const clickedMin = Math.floor(y / SLOT_HEIGHT_PX) * SLOT_INTERVAL_MIN + DAY_START_MIN;
    const snapped = minutesToSlot(Math.max(DAY_START_MIN, Math.min(DAY_END_MIN - SLOT_INTERVAL_MIN, clickedMin)));
    setAddingToSlot(snapped);
  }, []);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Schedule-${date}`,
  });

  // Generate time labels at every 15-minute mark
  const hourMarks: Array<{ min: number; label: string; isHour: boolean }> = [];
  for (let min = DAY_START_MIN; min <= DAY_END_MIN; min += SLOT_INTERVAL_MIN) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const isHour = m === 0;
    hourMarks.push({
      min,
      label: isHour
        ? formatTime(`${String(h).padStart(2, '0')}:00`)
        : `${String(m).padStart(2, '0')}`,
      isHour,
    });
  }

  // Generate all 15-min grid lines
  const gridLines: Array<{ min: number; isHour: boolean; isHalf: boolean }> = [];
  for (let min = DAY_START_MIN; min < DAY_END_MIN; min += SLOT_INTERVAL_MIN) {
    const isHour = min % 60 === 0;
    const isHalf = min % 30 === 0 && !isHour;
    gridLines.push({ min, isHour, isHalf });
  }

  if (loading) {
    return (
      <div id="day-view-loading" className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div id="day-view">
      <div id="day-view-toolbar" className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          {format(parseISO(date), 'EEEE, MMMM d')}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Button id="day-view-print" variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print Day
          </Button>
          <ExportDayDocButton date={date} entries={entries} />
          <Button id="day-view-add" size="sm" onClick={() => setAddingToSlot('08:00')}>
            <Plus className="h-4 w-4 mr-1" /> Add Activity
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          {/* Timeline container */}
          <div
            id="day-view-timeline"
            ref={timelineRef}
            className="relative flex gap-0 select-none"
            style={{ height: `${TIMELINE_HEIGHT}px` }}
            onClick={handleTimelineClick}
          >
            {/* Time labels column */}
            <div className="w-16 flex-shrink-0 relative">
              {hourMarks.map(({ min, label, isHour }) => {
                const top = (min - DAY_START_MIN) / SLOT_INTERVAL_MIN * SLOT_HEIGHT_PX;
                return (
                  <div
                    key={min}
                    className={`absolute right-2 font-mono -translate-y-2 ${
                      isHour
                        ? 'text-xs text-gray-500 font-semibold'
                        : 'text-[10px] text-gray-300 dark:text-gray-600'
                    }`}
                    style={{ top }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Grid + cards area */}
            <div className="flex-1 relative border-l border-gray-200 dark:border-gray-700">
              {/* Grid lines */}
              {gridLines.map(({ min, isHour, isHalf }) => {
                const top = (min - DAY_START_MIN) / SLOT_INTERVAL_MIN * SLOT_HEIGHT_PX;
                return (
                  <div
                    key={min}
                    className={`absolute left-0 right-0 pointer-events-none ${
                      isHour
                        ? 'border-t border-gray-200 dark:border-gray-600'
                        : isHalf
                        ? 'border-t border-gray-100 dark:border-gray-700 border-dashed'
                        : 'border-t border-gray-50 dark:border-gray-800'
                    }`}
                    style={{ top }}
                  />
                );
              })}

              {/* Activity cards — absolutely positioned */}
              {entries.map(entry => {
                const startMin = timeToMinutes(entry.time_slot);
                const top = (startMin - DAY_START_MIN) / SLOT_INTERVAL_MIN * SLOT_HEIGHT_PX;
                const height = Math.max(56, (entry.duration_minutes / SLOT_INTERVAL_MIN) * SLOT_HEIGHT_PX) - 4;

                return (
                  <div
                    key={entry.id}
                    data-activity-card
                    className="absolute left-1 right-1 z-10"
                    style={{ top: `${top}px`, height: `${height}px` }}
                    onClick={e => e.stopPropagation()}
                  >
                    <ActivityCard
                      entry={entry}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      onEdit={setEditingEntry}
                      onToggleSubActivity={handleToggleSubActivity}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      {entries.length === 0 && !loading && (
        <div id="day-view-empty" className="text-center py-8 text-gray-400">
          <p className="text-sm">No activities scheduled. Activities will auto-populate from your defaults.</p>
        </div>
      )}

      {/* Hidden print target */}
      <div className="hidden print:block">
        <PrintDayView ref={printRef} date={date} entries={entries} />
      </div>

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={async (data) => {
            await handleUpdate(editingEntry.id, data);
            setEditingEntry(null);
            toast.success('Activity updated');
          }}
        />
      )}

      {addingToSlot !== null && (
        <AddActivityModal
          date={date}
          defaultSlot={addingToSlot}
          onClose={() => setAddingToSlot(null)}
          onAdded={async () => {
            await fetchEntries();
            setAddingToSlot(null);
            toast.success('Activity added');
          }}
        />
      )}
    </div>
  );
}
