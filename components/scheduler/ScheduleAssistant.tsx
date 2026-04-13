'use client';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ScheduleEntry {
  id: number;
  activity_name: string;
  time_slot: string;
  duration_minutes: number;
  is_completed: number;
}

interface Activity {
  id: number;
  name: string;
  category: string | null;
}

interface Action {
  type: 'shift_all' | 'update_entry' | 'remove_entry' | 'replace_entry';
  minutes?: number;
  onlyIncomplete?: boolean;
  entryId?: number;
  activityId?: number;
  time_slot?: string;
  duration_minutes?: number;
}

interface Suggestion {
  summary: string;
  actions: Action[];
}

interface ScheduleAssistantProps {
  date: string;
  entries: ScheduleEntry[];
  onScheduleChanged: () => Promise<void>;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function shiftTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = Math.max(0, Math.min(1439, h * 60 + m + minutes));
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export default function ScheduleAssistant({ date, entries, onScheduleChanged }: ScheduleAssistantProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [applying, setApplying] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleAsk = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setSuggestion(null);
    try {
      const res = await fetch('/api/ai/schedule-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, entries, activities, date }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'AI error'); return; }
      setSuggestion(data);
    } catch {
      toast.error('Could not reach AI — check your connection');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!suggestion || suggestion.actions.length === 0) return;
    setApplying(true);
    try {
      for (const action of suggestion.actions) {
        if (action.type === 'shift_all') {
          const toShift = action.onlyIncomplete
            ? entries.filter(e => !e.is_completed)
            : entries;
          for (const entry of toShift) {
            const newTime = shiftTime(entry.time_slot, action.minutes ?? 0);
            await fetch(`/api/schedule/${entry.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ time_slot: newTime }),
            });
          }
        } else if (action.type === 'update_entry' && action.entryId) {
          const body: Record<string, unknown> = {};
          if (action.time_slot) body.time_slot = action.time_slot;
          if (action.duration_minutes) body.duration_minutes = action.duration_minutes;
          await fetch(`/api/schedule/${action.entryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } else if (action.type === 'remove_entry' && action.entryId) {
          await fetch(`/api/schedule/${action.entryId}`, { method: 'DELETE' });
        } else if (action.type === 'replace_entry' && action.entryId && action.activityId) {
          // Remove old entry
          await fetch(`/api/schedule/${action.entryId}`, { method: 'DELETE' });
          // Add new entry
          const entry = entries.find(e => e.id === action.entryId);
          await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_id: action.activityId,
              date,
              time_slot: action.time_slot ?? entry?.time_slot,
              duration_minutes: action.duration_minutes ?? entry?.duration_minutes ?? 30,
              sub_activity_ids: [],
              custom_sub_labels: [],
            }),
          });
        }
      }

      toast.success('Schedule updated!');
      await onScheduleChanged();
      setSuggestion(null);
      setMessage('');
      setOpen(false);
    } catch {
      toast.error('Something went wrong applying the changes');
    } finally {
      setApplying(false);
    }
  };

  // Build a human-readable preview of the actions
  const actionPreviews = suggestion?.actions.map(action => {
    if (action.type === 'shift_all') {
      const dir = (action.minutes ?? 0) > 0 ? 'later' : 'earlier';
      const mins = Math.abs(action.minutes ?? 0);
      return `Shift ${action.onlyIncomplete ? 'incomplete' : 'all'} activities ${mins} min ${dir}`;
    }
    if (action.type === 'update_entry') {
      const entry = entries.find(e => e.id === action.entryId);
      const parts = [];
      if (action.time_slot) parts.push(`move to ${formatTime(action.time_slot)}`);
      if (action.duration_minutes) parts.push(`set duration to ${action.duration_minutes} min`);
      return `${entry?.activity_name ?? 'Activity'}: ${parts.join(', ')}`;
    }
    if (action.type === 'remove_entry') {
      const entry = entries.find(e => e.id === action.entryId);
      return `Remove "${entry?.activity_name ?? 'activity'}" from today`;
    }
    if (action.type === 'replace_entry') {
      const oldEntry = entries.find(e => e.id === action.entryId);
      const newActivity = activities.find(a => a.id === action.activityId);
      return `Replace "${oldEntry?.activity_name ?? 'activity'}" with "${newActivity?.name ?? 'new activity'}"`;
    }
    return '';
  }) ?? [];

  return (
    <>
      {/* Floating AI button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ WebkitAppearance: 'none', appearance: 'none' }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg transition-all hover:scale-105 active:scale-95 select-none"
        aria-label="Open AI schedule assistant"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-semibold">AI Assist</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => { setOpen(false); setSuggestion(null); }} />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Schedule Assistant</p>
                  <p className="text-xs text-gray-500">{entries.length} activities today</p>
                </div>
              </div>
              <button type="button" onClick={() => { setOpen(false); setSuggestion(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Example prompts */}
            {!suggestion && !loading && (
              <div className="flex flex-wrap gap-2">
                {[
                  'We started 30 min late, shift everything back',
                  'Move lunch to 1pm',
                  'Remove the last activity today',
                ].map(example => (
                  <button key={example} type="button"
                    onClick={() => setMessage(example)}
                    style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    className="text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors cursor-pointer">
                    {example}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !loading) handleAsk(); }}
                placeholder="Describe what you'd like to change..."
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Button type="button" onClick={handleAsk} disabled={loading || !message.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0 px-3">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing your schedule...
              </div>
            )}

            {/* Suggestion preview */}
            {suggestion && (
              <div className="space-y-3">
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  suggestion.actions.length > 0
                    ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800'
                    : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                }`}>
                  {suggestion.actions.length > 0
                    ? <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  }
                  <p className={suggestion.actions.length > 0 ? 'text-purple-800 dark:text-purple-300' : 'text-amber-800 dark:text-amber-300'}>
                    {suggestion.summary}
                  </p>
                </div>

                {actionPreviews.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Changes to apply</p>
                    {actionPreviews.map((preview, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span>{preview}</span>
                      </div>
                    ))}
                  </div>
                )}

                {suggestion.actions.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1"
                      onClick={() => { setSuggestion(null); setMessage(''); }}>
                      Cancel
                    </Button>
                    <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={handleApply} disabled={applying}>
                      {applying ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Applying...</> : 'Apply Changes'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
