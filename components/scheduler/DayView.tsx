'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Plus, Printer, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
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
  onReset?: () => void;
}

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 20;
const SLOT_INTERVAL_MIN = 15;
const SLOT_HEIGHT_PX = 24; // minimum px per 15-minute slot row

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToSlot(totalMinutes: number): string {
  const snapped = Math.round(totalMinutes / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN;
  const h = Math.floor(snapped / 60);
  const m = snapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DAY_START_MIN = DAY_START_HOUR * 60;
const DAY_END_MIN = DAY_END_HOUR * 60;
const TOTAL_SLOTS = (DAY_END_MIN - DAY_START_MIN) / SLOT_INTERVAL_MIN;


export default function DayView({ date, onReset }: DayViewProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [addingToSlot, setAddingToSlot] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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

  const handleUpdateWithCascade = useCallback(async (id: number, data: Record<string, unknown>) => {
    if (!('time_slot' in data) && !('duration_minutes' in data)) {
      return handleUpdate(id, data);
    }
    try {
      const res = await fetch(`/api/schedule/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();

      // Re-fetch to get updated state, then cascade shifts
      const refreshed = await fetch(`/api/schedule?date=${date}`).then(r => r.json());
      if (!Array.isArray(refreshed)) { await fetchEntries(); return; }

      const sorted = [...refreshed].sort((a: ScheduleEntry, b: ScheduleEntry) =>
        timeToMinutes(a.time_slot) - timeToMinutes(b.time_slot)
      );

      const cascadeUpdates: Array<{ id: number; time_slot: string }> = [];
      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        const currEndMin = timeToMinutes(curr.time_slot) + curr.duration_minutes;
        const nextStartMin = timeToMinutes(next.time_slot);
        if (currEndMin > nextStartMin) {
          const newSlot = minutesToSlot(currEndMin);
          sorted[i + 1] = { ...next, time_slot: newSlot };
          cascadeUpdates.push({ id: next.id, time_slot: newSlot });
        }
      }

      if (cascadeUpdates.length > 0) {
        await Promise.all(cascadeUpdates.map(u =>
          fetch(`/api/schedule/${u.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time_slot: u.time_slot }),
          })
        ));
        toast.success(`Shifted ${cascadeUpdates.length} activit${cascadeUpdates.length === 1 ? 'y' : 'ies'} to avoid overlap`);
      }

      await fetchEntries();
    } catch {
      toast.error('Failed to update activity');
    }
  }, [date, handleUpdate, fetchEntries]);

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
    setEntries(arrayMove(entries, oldIndex, newIndex));

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

  const handleResetToDefaults = useCallback(async () => {
    if (!window.confirm('Reset this day to default activities? All current entries for this day will be removed.')) return;
    try {
      const res = await fetch(`/api/schedule?date=${date}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await fetchEntries();
      toast.success('Day reset to defaults');
      onReset?.();
    } catch {
      toast.error('Failed to reset day');
    }
  }, [date, fetchEntries, onReset]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Schedule-${date}`,
  });

  // Build timeline segments: one per activity (spanning its slots) or one per empty slot
  type Segment =
    | { type: 'empty'; slotIdx: number }
    | { type: 'activity'; slotIdx: number; spanSlots: number; entry: ScheduleEntry };

  const entryByStartSlot = new Map<number, ScheduleEntry>();
  const hiddenEntries: ScheduleEntry[] = [];
  for (const entry of entries) {
    const startMin = timeToMinutes(entry.time_slot);
    const startSlot = Math.round((startMin - DAY_START_MIN) / SLOT_INTERVAL_MIN);
    if (startSlot >= 0 && startSlot < TOTAL_SLOTS) {
      entryByStartSlot.set(startSlot, entry);
    } else {
      hiddenEntries.push(entry);
    }
  }

  // Detect entries hidden by overlap (covered by a preceding activity's duration)
  const segments: Segment[] = [];
  const coveredSlots = new Set<number>();
  let si = 0;
  while (si < TOTAL_SLOTS) {
    const entry = entryByStartSlot.get(si);
    if (entry) {
      const spanSlots = Math.max(1, Math.round(entry.duration_minutes / SLOT_INTERVAL_MIN));
      for (let k = 1; k < spanSlots; k++) coveredSlots.add(si + k);
      segments.push({ type: 'activity', slotIdx: si, spanSlots, entry });
      si += spanSlots;
    } else {
      segments.push({ type: 'empty', slotIdx: si });
      si += 1;
    }
  }
  const overlappedEntries = Array.from(entryByStartSlot.values()).filter(e => {
    const slot = Math.round((timeToMinutes(e.time_slot) - DAY_START_MIN) / SLOT_INTERVAL_MIN);
    return coveredSlots.has(slot);
  });

  if (loading) {
    return (
      <div id="day-view-loading" className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
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
          <Button id="day-view-reset" variant="outline" size="sm" onClick={handleResetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reset to Defaults
          </Button>
          <Button id="day-view-print" variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print Day
          </Button>
          <ExportDayDocButton date={date} entries={entries} />
          <Button id="day-view-add" size="sm" onClick={() => setAddingToSlot('08:00')}>
            <Plus className="h-4 w-4 mr-1" /> Add Activity
          </Button>
        </div>
      </div>

      {(hiddenEntries.length > 0 || overlappedEntries.length > 0) && (
        <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            <span className="font-medium">
              {hiddenEntries.length + overlappedEntries.length} hidden activit{hiddenEntries.length + overlappedEntries.length === 1 ? 'y' : 'ies'}
            </span>
            {hiddenEntries.length > 0 && (
              <span> ({hiddenEntries.map(e => e.activity_name).join(', ')} outside visible hours)</span>
            )}
            {overlappedEntries.length > 0 && (
              <span> ({overlappedEntries.map(e => e.activity_name).join(', ')} overlapping another activity)</span>
            )}
            {' — '}
            <button onClick={handleResetToDefaults} className="underline font-medium">Reset to Defaults</button>
            {' to fix.'}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <div id="day-view-timeline">
            {segments.map(seg => {
              if (seg.type === 'activity') {
                const slotLabels = Array.from({ length: seg.spanSlots }, (_, i) => {
                  const slotMin = DAY_START_MIN + (seg.slotIdx + i) * SLOT_INTERVAL_MIN;
                  const h = Math.floor(slotMin / 60);
                  const m = slotMin % 60;
                  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  return { i, isHour: m === 0, isHalf: m === 30, m, timeStr };
                });

                const slotHeight = seg.spanSlots * SLOT_HEIGHT_PX;

                return (
                  <div
                    key={seg.slotIdx}
                    className="flex items-start"
                  >
                    {/* Time labels at exact pixel positions */}
                    <div className="w-16 flex-shrink-0 relative select-none" style={{ minHeight: `${slotHeight}px` }}>
                      {slotLabels.map(({ i, isHour, isHalf, m, timeStr }) => (
                        <div
                          key={i}
                          className="absolute right-2"
                          style={{ top: `${i * SLOT_HEIGHT_PX + 4}px` }}
                        >
                          {isHour && (
                            <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400">
                              {formatTime(timeStr)}
                            </span>
                          )}
                          {isHalf && (
                            <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">:30</span>
                          )}
                          {!isHour && !isHalf && (
                            <span className="text-[10px] font-mono text-gray-200 dark:text-gray-700">
                              :{String(m).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Activity card — grows freely with content, no height clipping */}
                    <div className="flex-1 border-l border-gray-200 dark:border-gray-600 pl-1 pb-0.5">
                      <ActivityCard
                        entry={seg.entry}
                        cardMinHeight={slotHeight}
                        onUpdate={handleUpdate}
                        onRemove={handleRemove}
                        onEdit={setEditingEntry}
                        onToggleSubActivity={handleToggleSubActivity}
                      />
                    </div>
                  </div>
                );
              }

              // Empty slot
              const slotMin = DAY_START_MIN + seg.slotIdx * SLOT_INTERVAL_MIN;
              const h = Math.floor(slotMin / 60);
              const m = slotMin % 60;
              const isHour = m === 0;
              const isHalf = m === 30;
              const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

              return (
                <div
                  key={seg.slotIdx}
                  className="flex gap-0"
                  style={{ minHeight: `${SLOT_HEIGHT_PX}px` }}
                >
                  <div className="w-16 flex-shrink-0 text-right pr-2 pt-1 select-none">
                    {isHour && (
                      <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400">
                        {formatTime(timeStr)}
                      </span>
                    )}
                    {isHalf && (
                      <span className="text-[10px] font-mono text-gray-300 dark:text-gray-600">:30</span>
                    )}
                    {!isHour && !isHalf && (
                      <span className="text-[10px] font-mono text-gray-200 dark:text-gray-700">
                        :{String(m).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex-1 border-l pl-1 pb-0.5 ${
                      isHour
                        ? 'border-gray-200 dark:border-gray-600'
                        : isHalf
                        ? 'border-gray-100 dark:border-gray-700'
                        : 'border-gray-50 dark:border-gray-800'
                    }`}
                  >
                    <button
                      id={`add-to-slot-${timeStr.replace(':', '-')}`}
                      onClick={() => setAddingToSlot(timeStr)}
                      className="w-full h-full min-h-[22px] border border-dashed border-transparent hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors flex items-center justify-center gap-1 text-xs text-transparent hover:text-red-500"
                      aria-label={`Add activity at ${formatTime(timeStr)}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
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
            await handleUpdateWithCascade(editingEntry.id, data);
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
