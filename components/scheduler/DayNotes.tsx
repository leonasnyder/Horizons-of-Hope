'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { NotebookPen, Check, Loader2 } from 'lucide-react';

interface DayNotesProps {
  date: string; // 'YYYY-MM-DD'
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function DayNotes({ date }: DayNotesProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [expanded, setExpanded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef('');

  // Fetch note when date changes
  useEffect(() => {
    setLoading(true);
    setSaveState('idle');
    fetch(`/api/day-notes/${date}`)
      .then(r => r.json())
      .then(data => {
        const text = data.content ?? '';
        setContent(text);
        lastSaved.current = text;
        // Auto-expand if there's existing content
        if (text.trim()) setExpanded(true);
      })
      .catch(() => setContent(''))
      .finally(() => setLoading(false));
  }, [date]);

  // Auto-save with 1s debounce
  const save = useCallback(async (text: string) => {
    if (text === lastSaved.current) return;
    setSaveState('saving');
    try {
      const res = await fetch(`/api/day-notes/${date}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error();
      lastSaved.current = text;
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, [date]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    setSaveState('idle');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(text), 1000);
  };

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Header — always visible, toggles body */}
      <button
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <NotebookPen className="h-4 w-4 text-red-500 shrink-0" />
        <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
          Day Notes
        </span>

        {/* Save indicator */}
        {saveState === 'saving' && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </span>
        )}
        {saveState === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
        {saveState === 'error' && (
          <span className="text-xs text-red-500">Save failed</span>
        )}

        {/* Preview line when collapsed and has content */}
        {!expanded && content.trim() && (
          <span className="text-xs text-gray-400 truncate max-w-[160px] ml-1">
            {content.trim().split('\n')[0]}
          </span>
        )}

        <svg
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 border-t dark:border-gray-700">
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <textarea
              className="w-full mt-3 min-h-[120px] resize-y rounded-lg border border-input bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              placeholder="Add notes for today — observations, highlights, reminders, anything you want to remember about this day…"
              value={content}
              onChange={handleChange}
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  );
}
