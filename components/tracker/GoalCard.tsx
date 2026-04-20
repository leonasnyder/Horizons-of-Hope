'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Check, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { accuracy } from '@/lib/utils';
import ResponseButtons from './ResponseButtons';
import ResponseLog from './ResponseLog';
import EditResponseModal from './EditResponseModal';
import { toast } from 'sonner';

interface Subcategory {
  id: number;
  label: string;
  response_type: 'correct' | 'incorrect';
}

interface Response {
  id: number;
  goal_id: number;
  response_type: 'correct' | 'incorrect';
  subcategory_id: number | null;
  subcategory_label: string | null;
  timestamp: string;
  session_notes: string | null;
}

interface Goal {
  id: number;
  name: string;
  description: string | null;
  color: string;
  subcategories: Subcategory[];
}

interface GoalCardProps {
  goal: Goal;
  date: string;
  responses: Response[];
  onResponseAdded: () => void;
}

type NoteSaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function GoalCard({ goal, date, responses, onResponseAdded }: GoalCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [sessionNote, setSessionNote] = useState('');
  const [noteSaveState, setNoteSaveState] = useState<NoteSaveState>('idle');
  const [editingResponse, setEditingResponse] = useState<Response | null>(null);

  // Refs used for auto-save debounce (matches the pattern used by DayNotes)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef('');
  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing note whenever goal/date changes. Always reset the
  // local state — including to empty — so switching dates doesn't leak
  // the previous date's note into the new one.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/goals/session-notes?goal_id=${goal.id}&date=${date}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const text = typeof data.notes === 'string' ? data.notes : '';
        setSessionNote(text);
        lastSavedRef.current = text;
        setNoteSaveState('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setSessionNote('');
        lastSavedRef.current = '';
      });
    return () => { cancelled = true; };
  }, [goal.id, date]);

  // Persist notes — called from both the debounced auto-save path and
  // the unmount/visibility-change "flush" path.
  const persistNote = useCallback(async (text: string) => {
    if (text === lastSavedRef.current) return;
    setNoteSaveState('saving');
    try {
      const res = await fetch('/api/goals/session-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goal.id, date, notes: text }),
      });
      if (!res.ok) throw new Error();
      lastSavedRef.current = text;
      setNoteSaveState('saved');
      if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
      savedIndicatorTimerRef.current = setTimeout(() => setNoteSaveState('idle'), 2000);
    } catch {
      setNoteSaveState('error');
    }
  }, [goal.id, date]);

  // Auto-save with 1s debounce whenever the note changes.
  useEffect(() => {
    if (sessionNote === lastSavedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { persistNote(sessionNote); }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sessionNote, persistNote]);

  // Keep refs in sync with the latest values so the flush handler (below)
  // always reads the current data without re-registering listeners.
  const sessionNoteRef = useRef(sessionNote);
  useEffect(() => { sessionNoteRef.current = sessionNote; }, [sessionNote]);
  const goalIdRef = useRef(goal.id);
  useEffect(() => { goalIdRef.current = goal.id; }, [goal.id]);
  const dateRef = useRef(date);
  useEffect(() => { dateRef.current = date; }, [date]);

  // Best-effort flush on unmount & when the tab is hidden so notes aren't
  // lost if the user navigates away / closes the tab within the 1s debounce.
  // Deps are intentionally empty so the listeners are registered ONCE — if
  // we included sessionNote, the cleanup (which calls flush) would fire on
  // every keystroke and spam the API.
  useEffect(() => {
    const flush = () => {
      const text = sessionNoteRef.current;
      if (text === lastSavedRef.current) return;
      const body = JSON.stringify({
        goal_id: goalIdRef.current,
        date: dateRef.current,
        notes: text,
      });
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        try {
          navigator.sendBeacon(
            '/api/goals/session-notes',
            new Blob([body], { type: 'application/json' })
          );
          lastSavedRef.current = text;
          return;
        } catch { /* fall through to fetch */ }
      }
      // Fallback — keepalive fetch so the request survives page teardown.
      fetch('/api/goals/session-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
      if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
    };
  }, []);

  const correct = responses.filter(r => r.response_type === 'correct').length;
  const incorrect = responses.filter(r => r.response_type === 'incorrect').length;
  const total = correct + incorrect;
  const acc = accuracy(correct, total);

  const correctSubcats = goal.subcategories.filter(s => s.response_type === 'correct');
  const incorrectSubcats = goal.subcategories.filter(s => s.response_type === 'incorrect');

  const handleLog = async (response_type: 'correct' | 'incorrect', subcategory_id: number) => {
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goal.id,
          subcategory_id,
          response_type,
          date,
        }),
      });
      if (!res.ok) throw new Error();
      onResponseAdded();
      toast.success(
        response_type === 'correct' ? '✓ Correct response logged' : '✗ Incorrect response logged'
      );
    } catch {
      toast.error('Failed to log response');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/responses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onResponseAdded();
      toast.success('Response removed');
    } catch {
      toast.error('Failed to delete response');
    }
  };

  const handleEdit = async (id: number, data: {
    response_type: 'correct' | 'incorrect';
    subcategory_id: number | null;
    session_notes: string | null;
  }) => {
    const res = await fetch(`/api/responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    onResponseAdded();
    toast.success('Response updated');
  };

  const chartData = [
    { name: 'Correct', value: correct, fill: '#22C55E' },
    { name: 'Incorrect', value: incorrect, fill: '#EF4444' },
  ];

  return (
    <div id={`goal-card-${goal.id}`} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <button
        id={`goal-card-header-${goal.id}`}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: goal.color }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{goal.name}</h3>
          {goal.description && (
            <p className="text-xs text-gray-500 truncate">{goal.description}</p>
          )}
        </div>
        <div id={`goal-card-tally-${goal.id}`} className="flex items-center gap-3 text-sm flex-shrink-0">
          <span className="text-green-600 font-semibold">✓ {correct}</span>
          <span className="text-red-500 font-semibold">✗ {incorrect}</span>
          {total > 0 && (
            <span className={`font-bold ${
              acc >= 80 ? 'text-green-600' : acc >= 50 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {acc}%
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div id={`goal-card-body-${goal.id}`} className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700">
          {/* Response buttons */}
          <div className="pt-4">
            <ResponseButtons
              goalId={goal.id}
              correctSubcats={correctSubcats}
              incorrectSubcats={incorrectSubcats}
              onLog={handleLog}
            />
          </div>

          {/* Mini bar chart */}
          {total > 0 && (
            <div id={`goal-card-chart-${goal.id}`} className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [value, 'Responses']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Response log */}
          <div id={`goal-card-log-section-${goal.id}`}>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Today's Response Log ({total})
            </p>
            <ResponseLog
              responses={responses}
              onDelete={handleDelete}
              onEdit={r => setEditingResponse(r as Response)}
            />
          </div>

          {/* Session note (auto-saves) */}
          <div id={`goal-card-note-${goal.id}`} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Session Notes</span>
              </div>
              <div className="text-xs" aria-live="polite">
                {noteSaveState === 'saving' && (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </span>
                )}
                {noteSaveState === 'saved' && (
                  <span className="flex items-center gap-1 text-green-500">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
                {noteSaveState === 'error' && (
                  <span className="text-red-500">Save failed</span>
                )}
              </div>
            </div>
            <textarea
              id={`goal-session-note-${goal.id}`}
              placeholder="Write notes about today's session..."
              value={sessionNote}
              onChange={e => setSessionNote(e.target.value)}
              rows={3}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring dark:bg-gray-700 dark:border-gray-600 resize-none"
            />
          </div>
        </div>
      )}
      {editingResponse && (
        <EditResponseModal
          response={editingResponse}
          goalSubcategories={goal.subcategories}
          onClose={() => setEditingResponse(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
