'use client';
import { Check, GripVertical, Trash2, Edit2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, formatTime } from '@/lib/utils';

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

  const handleRemove = async () => {
    await onRemove(entry.id);
  };

  return (
    <div ref={setNodeRef} style={style} id={`activity-card-${entry.id}`}>
    <div
      style={cardMinHeight ? { minHeight: `${cardMinHeight}px`, overflow: 'visible', position: 'relative' } : { position: 'relative' }}
      className={cn(
        'flex flex-col gap-1 p-3 rounded-lg border bg-white dark:bg-gray-800 shadow-sm group',
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
            {formatTime(entry.time_slot)} · {shownDuration} min
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

      {/* Sub-activities below — always full width, wraps on any screen size */}
      {entry.entry_sub_activities.length > 0 && (
        <div id={`entry-subactivities-${entry.id}`} className="flex flex-col gap-0.5 pl-[76px]">
          {entry.entry_sub_activities.map(s => (
            <label
              key={s.id}
              id={`entry-subactivity-${s.id}`}
              className="flex items-center gap-1.5 cursor-pointer min-h-[28px]"
            >
              <input
                type="checkbox"
                checked={!!s.completed}
                onChange={e => onToggleSubActivity(entry.id, s.id, e.target.checked ? 1 : 0)}
                className="h-4 w-4 rounded accent-red-600 flex-shrink-0"
              />
              <span className={`text-xs ${s.completed ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {s.label}
              </span>
            </label>
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
    </div>
  );
}
