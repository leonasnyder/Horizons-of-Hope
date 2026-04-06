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
import { generateTimeSlots, formatTime } from '@/lib/utils';
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

export default function DayView({ date }: DayViewProps) {
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
    // Optimistic update
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
      // Rollback on failure
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

    // Swap time slots between the two entries
    const draggedEntry = entries[oldIndex];
    const targetEntry = entries[newIndex];

    const newEntries = arrayMove(entries, oldIndex, newIndex);
    setEntries(newEntries); // Optimistic update

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
      await fetchEntries(); // Revert
    }
  }, [entries, fetchEntries]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Schedule-${date}`,
  });

  const timeSlots = generateTimeSlots(7, 18, 30);
  const entriesBySlot = entries.reduce<Record<string, ScheduleEntry[]>>((acc, e) => {
    (acc[e.time_slot] ??= []).push(e);
    return acc;
  }, {});

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
          <div id="day-view-timeline" className="space-y-1">
            {timeSlots.map(slot => {
              const slotEntries = entriesBySlot[slot] ?? [];
              return (
                <div
                  key={slot}
                  id={`time-slot-${slot.replace(':', '-')}`}
                  className="flex gap-2 min-h-[52px]"
                >
                  <div className="w-16 flex-shrink-0 text-xs text-gray-400 font-mono pt-4 text-right pr-2 select-none">
                    {formatTime(slot)}
                  </div>
                  <div className="flex-1 border-l border-gray-100 dark:border-gray-700 pl-3 pb-1 space-y-1">
                    {slotEntries.length > 0 ? (
                      slotEntries.map(entry => (
                        <ActivityCard
                          key={entry.id}
                          entry={entry}
                          onUpdate={handleUpdate}
                          onRemove={handleRemove}
                          onEdit={setEditingEntry}
                          onToggleSubActivity={handleToggleSubActivity}
                        />
                      ))
                    ) : (
                      <button
                        id={`add-to-slot-${slot.replace(':', '-')}`}
                        onClick={() => setAddingToSlot(slot)}
                        className="w-full h-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-300 hover:border-orange-300 hover:text-orange-400 dark:hover:border-orange-700 transition-colors flex items-center justify-center gap-1 text-sm"
                        aria-label={`Add activity at ${formatTime(slot)}`}
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    )}
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
