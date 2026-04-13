'use client';
import React, { useState, useRef, useCallback } from 'react';
import { Check, GripVertical, Trash2, Edit2, Circle, CheckCircle2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, formatTime } from '@/lib/utils';

const SWIPE_THRESHOLD = 72;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(249,115,22,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Social': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  'Motor Skills': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'Communication': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'Life Skills': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  'Academic': 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
};

export interface EntrySubActivity {
  id: number;
  sub_activity_id: number | null;
  label: string;
  completed: number;
}

interface ScheduleEntryForCard {
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

interface ActivityCardProps {
  entry: ScheduleEntryForCard;
  cardMinHeight?: number;
  displayDuration?: number;
  readOnly?: boolean;
  onUpdate: (id: number, data: Record<string, unknown>) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onEdit: (entry: ScheduleEntryForCard) => void;
  onToggleSubActivity: (entryId: number, entrySubActivityId: number, completed: number) => Promise<void>;
  onResizeStart?: (id: number, initialY: number, initialDuration: number) => void;
}

export default function ActivityCard({
  entry, cardMinHeight, displayDuration, readOnly,
  onUpdate, onRemove, onEdit, onToggleSubActivity, onResizeStart,
}: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const shownDuration = displayDuration ?? entry.duration_minutes;

  const handleComplete = async () => {
    await onUpdate(entry.id, { is_completed: entry.is_completed ? 0 : 1 });
  };

  const handleRemove = useCallback(async () => {
    await onRemove(entry.id);
  }, [onRemove, entry.id]);

  // Swipe-to-delete state
  const [swipeX, setSwipeX] = useState(0);
  const swipeXRef = useRef(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiping = useRef(false);

  const onSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDragging || readOnly) return;
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swiping.current = false;
  }, [isDragging, readOnly]);

  const onSwipeTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStart.current || isDragging) return;
    const dx = e.touches[0].clientX - swipeStart.current.x;
    const dy = e.touches[0].clientY - swipeStart.current.y;
    if (!swiping.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) >= Math.abs(dx) || dx >= 0) { swipeStart.current = null; return; }
      swiping.current = true;
    }
    const val = Math.max(dx, -SWIPE_THRESHOLD * 1.5);
    swipeXRef.current = val;
    setSwipeX(val);
  }, [isDragging]);

  const onSwipeTouchEnd = useCallback(() => {
    if (swipeXRef.current < -SWIPE_THRESHOLD) {
      handleRemove();
    }
    swipeXRef.current = 0;
    setSwipeX(0);
    swipeStart.current = null;
    swiping.current = false;
  }, [handleRemove]);

  const color = entry.color || '#F97316';
  const cardStyle: React.CSSProperties = {
    ...(cardMinHeight ? { minHeight: `${cardMinHeight}px`, overflow: 'visible' } : {}),
    position: 'relative',
    backgroundColor: hexToRgba(color, 0.08),
    borderColor: hexToRgba(color, 0.4),
  };

  return (
    <div ref={setNodeRef} style={style} id={`activity-card-${entry.id}`} className="relative">
      {/* Red delete strip — only visible while swiping */}
      {!readOnly && swipeX < 0 && (
        <div className="absolute inset-0 flex items-center justify-end bg-red-500 rounded-lg pr-5 pointer-events-none">
          <Trash2 className="h-5 w-5 text-white" />
        </div>
      )}
      {/* Sliding card */}
      <div
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.25s ease' : 'none',
        }}
        onTouchStart={onSwipeTouchStart}
        onTouchMove={onSwipeTouchMove}
        onTouchEnd={onSwipeTouchEnd}
      >
    <div
      style={cardStyle}
      className={cn(
        'flex flex-col gap-1 p-3 rounded-lg border shadow-sm group',
        isDragging && 'opacity-50 shadow-lg z-50',
        entry.is_completed && 'opacity-60'
      )}
    >
      {/* Top row: drag handle, complete button, name/time, edit/delete */}
      <div className="flex items-start gap-2">
        {!readOnly && (
          <button
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex items-center justify-center min-w-[32px] min-h-[44px]"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <button
          id={`activity-card-complete-${entry.id}`}
          onClick={readOnly ? undefined : handleComplete}
          disabled={readOnly}
          className={cn(
            'w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5',
            entry.is_completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-green-400',
            readOnly && 'cursor-default'
          )}
          aria-label={entry.is_completed ? 'Mark incomplete' : 'Mark complete'}
          aria-pressed={!!entry.is_completed}
        >
          {entry.is_completed && <Check className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-sm font-medium', entry.is_completed && 'line-through text-gray-400')}>
              {entry.activity_name}
            </span>
            {entry.category && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                CATEGORY_COLORS[entry.category] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              )}>
                {entry.category}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {(() => {
              const [h, m] = entry.time_slot.split(':').map(Number);
              const endMin = h * 60 + m + shownDuration;
              const eh = Math.floor(endMin / 60) % 24;
              const em = endMin % 60;
              const endSlot = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
              return `${formatTime(entry.time_slot)} – ${formatTime(endSlot)} · ${shownDuration} min`;
            })()}
            {entry.notes && <span className="ml-2 italic break-words">{entry.notes}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            id={`activity-card-edit-${entry.id}`}
            onClick={() => onEdit(entry)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={`Edit ${entry.activity_name}`}
          >
            <Edit2 className="h-4 w-4 text-gray-500" />
          </button>
          {!readOnly && (
            <button
              id={`activity-card-remove-${entry.id}`}
              onClick={handleRemove}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={`Remove ${entry.activity_name}`}
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-activities as checklist */}
      {entry.entry_sub_activities.length > 0 && (
        <div id={`entry-subactivities-${entry.id}`} className="flex flex-col gap-0.5 pl-[76px] pt-1">
          {entry.entry_sub_activities.map(s => (
            <button
              key={s.id}
              id={`entry-subactivity-${s.id}`}
              type="button"
              onClick={() => onToggleSubActivity(entry.id, s.id, s.completed ? 0 : 1)}
              style={{ WebkitAppearance: 'none', appearance: 'none' }}
              className="flex items-center gap-2 text-left cursor-pointer select-none group/sub w-full"
            >
              {/* Circle toggle */}
              {s.completed
                ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                : <Circle className="h-4 w-4 text-gray-300 flex-shrink-0 group-hover/sub:text-green-400 transition-colors" />
              }
              <span className={cn(
                'text-xs',
                s.completed
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-600 dark:text-gray-300 group-hover/sub:text-gray-800 dark:group-hover/sub:text-gray-100'
              )}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Resize handle — always visible bar at the bottom */}
      {!readOnly && onResizeStart && (
        <div
          className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center cursor-ns-resize touch-none"
          onPointerDown={e => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(entry.id, e.clientY, entry.duration_minutes);
          }}
          aria-label="Drag to resize duration"
        >
          <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
      )}
    </div>
      </div>{/* end sliding wrapper */}
    </div>
  );
}
