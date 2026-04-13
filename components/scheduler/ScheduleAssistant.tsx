'use client';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Check, AlertCircle, Wand2, ChevronLeft } from 'lucide-react';
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

// Plan Generator types
interface NewActivityDef {
  name: string;
  category?: string;
  duration_minutes: number;
  time_slot: string;
  sub_labels?: string[];
}

interface PlanAction {
  type: 'schedule_existing' | 'create_and_schedule';
  activityId?: number;           // for schedule_existing
  newActivity?: NewActivityDef;  // for create_and_schedule
  time_slot: string;
  duration_minutes: number;
}

interface PlanSuggestion {
  summary: string;
  actions: PlanAction[];
}

interface ScheduleAssistantProps {
  date: string;
  entries: ScheduleEntry[];
  onScheduleChanged: () => Promise<void>;
}

type PanelMode = 'home' | 'ask' | 'plan';

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
  const [panelMode, setPanelMode] = useState<PanelMode>('home');

  // Ask mode state
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [applying, setApplying] = useState(false);

  // Suggestions mode state
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [proactiveSuggestion, setProactiveSuggestion] = useState<Suggestion | null>(null);

  // Plan Generator state
  const [planDescription, setPlanDescription] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planSuggestion, setPlanSuggestion] = useState<PlanSuggestion | null>(null);
  const [planApplying, setPlanApplying] = useState(false);

  const [activities, setActivities] = useState<Activity[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open && panelMode === 'ask') setTimeout(() => inputRef.current?.focus(), 100);
    if (open && panelMode === 'plan') setTimeout(() => planInputRef.current?.focus(), 100);
  }, [open, panelMode]);

  const handleClose = () => {
    setOpen(false);
    setPanelMode('home');
    setSuggestion(null);
    setProactiveSuggestion(null);
    setPlanSuggestion(null);
    setMessage('');
    setPlanDescription('');
  };

  // --- Ask mode ---
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
      await applyActions(suggestion.actions);
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

  // --- Proactive suggestions ---
  const handleGetSuggestions = async () => {
    setSuggestionsLoading(true);
    setProactiveSuggestion(null);
    try {
      const systemMessage = 'Analyze this schedule and proactively suggest the single most helpful improvement. Consider: activities running over time, gaps in the schedule, ordering issues, or anything that could make the day smoother.';
      const res = await fetch('/api/ai/schedule-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: systemMessage, entries, activities, date, proactive: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'AI error'); return; }
      setProactiveSuggestion(data);
    } catch {
      toast.error('Could not reach AI — check your connection');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleApplyProactive = async () => {
    if (!proactiveSuggestion || proactiveSuggestion.actions.length === 0) return;
    setApplying(true);
    try {
      await applyActions(proactiveSuggestion.actions);
      toast.success('Schedule updated!');
      await onScheduleChanged();
      setProactiveSuggestion(null);
      setOpen(false);
    } catch {
      toast.error('Something went wrong applying the changes');
    } finally {
      setApplying(false);
    }
  };

  // --- Shared action executor ---
  const applyActions = async (actions: Action[]) => {
    for (const action of actions) {
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
        await fetch(`/api/schedule/${action.entryId}`, { method: 'DELETE' });
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
  };

  // --- Plan Generator ---
  const handleGeneratePlan = async () => {
    if (!planDescription.trim()) return;
    setPlanLoading(true);
    setPlanSuggestion(null);
    try {
      const res = await fetch('/api/ai/plan-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: planDescription, activities, date, existingEntries: entries }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'AI error'); return; }
      setPlanSuggestion(data);
    } catch {
      toast.error('Could not reach AI — check your connection');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleApplyPlan = async () => {
    if (!planSuggestion || planSuggestion.actions.length === 0) return;
    setPlanApplying(true);
    try {
      for (const action of planSuggestion.actions) {
        if (action.type === 'schedule_existing' && action.activityId) {
          await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_id: action.activityId,
              date,
              time_slot: action.time_slot,
              duration_minutes: action.duration_minutes,
              sub_activity_ids: [],
              custom_sub_labels: [],
            }),
          });
        } else if (action.type === 'create_and_schedule' && action.newActivity) {
          const na = action.newActivity;
          // Create the activity
          const actRes = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: na.name,
              category: na.category ?? null,
              color: null,
              description: null,
              default_duration_minutes: na.duration_minutes,
              auto_schedule: false,
              auto_schedule_days: [],
              sub_activities: na.sub_labels ?? [],
            }),
          });
          if (!actRes.ok) continue;
          const actData = await actRes.json();
          const newId = actData.id;
          if (!newId) continue;
          // Schedule it
          await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activity_id: newId,
              date,
              time_slot: action.time_slot,
              duration_minutes: action.duration_minutes,
              sub_activity_ids: [],
              custom_sub_labels: na.sub_labels ?? [],
            }),
          });
        }
      }
      toast.success('Plan added to your schedule!');
      await onScheduleChanged();
      setPlanSuggestion(null);
      setPlanDescription('');
      setOpen(false);
    } catch {
      toast.error('Something went wrong applying the plan');
    } finally {
      setPlanApplying(false);
    }
  };

  // --- Action preview builders ---
  const buildActionPreviews = (actions: Action[]) => actions.map(action => {
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
  });

  const buildPlanPreviews = (actions: PlanAction[]) => actions.map(action => {
    if (action.type === 'schedule_existing' && action.activityId) {
      const act = activities.find(a => a.id === action.activityId);
      return `${formatTime(action.time_slot)} — ${act?.name ?? 'Existing activity'} (${action.duration_minutes} min)`;
    }
    if (action.type === 'create_and_schedule' && action.newActivity) {
      return `${formatTime(action.time_slot)} — ✨ ${action.newActivity.name} (${action.duration_minutes} min) [new]`;
    }
    return '';
  });

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
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {panelMode !== 'home' && (
                  <button type="button" onClick={() => { setPanelMode('home'); setSuggestion(null); setPlanSuggestion(null); setProactiveSuggestion(null); }}
                    style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 mr-1">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {panelMode === 'home' && 'Schedule Assistant'}
                    {panelMode === 'ask' && 'Ask AI'}
                    {panelMode === 'plan' && 'Plan Generator'}
                  </p>
                  <p className="text-xs text-gray-500">{entries.length} activities today</p>
                </div>
              </div>
              <button type="button" onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* HOME MODE */}
            {panelMode === 'home' && (
              <div className="space-y-3">
                {/* Get Suggestions button */}
                <button
                  type="button"
                  style={{ WebkitAppearance: 'none', appearance: 'none' }}
                  onClick={async () => {
                    setProactiveSuggestion(null);
                    await handleGetSuggestions();
                  }}
                  disabled={suggestionsLoading || entries.length === 0}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                    {suggestionsLoading ? <Loader2 className="h-4 w-4 text-purple-600 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Get Suggestions</p>
                    <p className="text-xs text-gray-500">AI analyzes your schedule and recommends improvements</p>
                  </div>
                </button>

                {/* Proactive suggestion result on home screen */}
                {proactiveSuggestion && (
                  <div className="space-y-2">
                    <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      proactiveSuggestion.actions.length > 0
                        ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800'
                        : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    }`}>
                      {proactiveSuggestion.actions.length > 0
                        ? <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        : <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      }
                      <p className={proactiveSuggestion.actions.length > 0 ? 'text-purple-800 dark:text-purple-300' : 'text-amber-800 dark:text-amber-300'}>
                        {proactiveSuggestion.summary}
                      </p>
                    </div>
                    {proactiveSuggestion.actions.length > 0 && (
                      <>
                        <div className="space-y-1">
                          {buildActionPreviews(proactiveSuggestion.actions).map((preview, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm px-1">
                              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                              <span>{preview}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1"
                            onClick={() => setProactiveSuggestion(null)}>
                            Dismiss
                          </Button>
                          <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={handleApplyProactive} disabled={applying}>
                            {applying ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Applying...</> : 'Apply'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Make a Change button */}
                <button
                  type="button"
                  style={{ WebkitAppearance: 'none', appearance: 'none' }}
                  onClick={() => { setPanelMode('ask'); setProactiveSuggestion(null); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                    <Send className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Make a Change</p>
                    <p className="text-xs text-gray-500">Tell AI what you&apos;d like to adjust in plain English</p>
                  </div>
                </button>

                {/* Plan Generator button */}
                <button
                  type="button"
                  style={{ WebkitAppearance: 'none', appearance: 'none' }}
                  onClick={() => { setPanelMode('plan'); setProactiveSuggestion(null); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                    <Wand2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Plan Generator</p>
                    <p className="text-xs text-gray-500">Generate a full activity plan from a description</p>
                  </div>
                </button>
              </div>
            )}

            {/* ASK MODE */}
            {panelMode === 'ask' && (
              <div className="space-y-4">
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

                {/* Quick example chips */}
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

                {loading && (
                  <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing your schedule...
                  </div>
                )}

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

                    {buildActionPreviews(suggestion.actions).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Changes to apply</p>
                        {buildActionPreviews(suggestion.actions).map((preview, i) => (
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
            )}

            {/* PLAN GENERATOR MODE */}
            {panelMode === 'plan' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Describe the plan you want to generate. AI will use activities from your library and create new ones as needed.
                </p>

                <div className="flex gap-2">
                  <input
                    ref={planInputRef}
                    type="text"
                    value={planDescription}
                    onChange={e => setPlanDescription(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !planLoading) handleGeneratePlan(); }}
                    placeholder="e.g. Morning routine starting at 7am..."
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Button type="button" onClick={handleGeneratePlan} disabled={planLoading || !planDescription.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0 px-3">
                    {planLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Quick plan examples */}
                {!planSuggestion && !planLoading && (
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Morning routine starting at 7am',
                      'Afternoon sensory break activities',
                      'Evening wind-down starting at 6pm',
                    ].map(example => (
                      <button key={example} type="button"
                        onClick={() => setPlanDescription(example)}
                        style={{ WebkitAppearance: 'none', appearance: 'none' }}
                        className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors cursor-pointer">
                        {example}
                      </button>
                    ))}
                  </div>
                )}

                {planLoading && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating your plan...
                  </div>
                )}

                {planSuggestion && (
                  <div className="space-y-3">
                    <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      planSuggestion.actions.length > 0
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    }`}>
                      {planSuggestion.actions.length > 0
                        ? <Wand2 className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                        : <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      }
                      <p className={planSuggestion.actions.length > 0 ? 'text-indigo-800 dark:text-indigo-300' : 'text-amber-800 dark:text-amber-300'}>
                        {planSuggestion.summary}
                      </p>
                    </div>

                    {planSuggestion.actions.length > 0 && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activities to add</p>
                        {buildPlanPreviews(planSuggestion.actions).map((preview, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{preview}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {planSuggestion.actions.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1"
                          onClick={() => { setPlanSuggestion(null); setPlanDescription(''); }}>
                          Cancel
                        </Button>
                        <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={handleApplyPlan} disabled={planApplying}>
                          {planApplying ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Adding...</> : 'Add to Schedule'}
                        </Button>
                      </div>
                    )}
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
