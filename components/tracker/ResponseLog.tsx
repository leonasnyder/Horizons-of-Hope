'use client';
import { Trash2, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Response {
  id: number;
  response_type: 'correct' | 'incorrect';
  subcategory_id: number | null;
  subcategory_label: string | null;
  timestamp: string;
  session_notes: string | null;
}

interface ResponseLogProps {
  responses: Response[];
  onDelete: (id: number) => Promise<void>;
  onEdit: (response: Response) => void;
}

export default function ResponseLog({ responses, onDelete, onEdit }: ResponseLogProps) {
  if (responses.length === 0) {
    return (
      <div id="response-log-empty" className="text-center py-4 text-gray-400 text-sm">
        No responses logged yet
      </div>
    );
  }

  return (
    <div id="response-log" className="space-y-1 max-h-52 overflow-y-auto pr-1">
      {responses.map(r => (
        <div
          key={r.id}
          id={`response-log-entry-${r.id}`}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
            r.response_type === 'correct'
              ? 'bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800'
          )}
        >
          <span className={cn(
            'font-bold text-xs px-1.5 py-0.5 rounded flex-shrink-0',
            r.response_type === 'correct'
              ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
              : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
          )}>
            {r.response_type === 'correct' ? '✓' : '✗'}
          </span>
          <span className="flex-1 truncate">{r.subcategory_label ?? r.response_type}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
            {format(parseISO(r.timestamp), 'h:mm a')}
          </span>
          <button
            id={`response-edit-${r.id}`}
            onClick={() => onEdit(r)}
            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-400 hover:text-blue-500 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center flex-shrink-0"
            aria-label="Edit response"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            id={`response-delete-${r.id}`}
            onClick={() => onDelete(r.id)}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-gray-400 hover:text-red-500 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center flex-shrink-0"
            aria-label="Delete response"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
