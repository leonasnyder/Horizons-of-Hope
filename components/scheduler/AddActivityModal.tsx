'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface Activity { id: number; name: string; category: string | null; }

interface AddActivityModalProps {
  date: string;
  defaultSlot: string;
  onClose: () => void;
  onAdded: () => Promise<void>;
}

export default function AddActivityModal({ date, defaultSlot, onClose, onAdded }: AddActivityModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [timeSlot, setTimeSlot] = useState(defaultSlot);
  const [duration, setDuration] = useState('30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subActivities, setSubActivities] = useState<{ id: number; label: string }[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([]);
  const [customSubLabels, setCustomSubLabels] = useState<string[]>([]);
  const [newSubLabel, setNewSubLabel] = useState('');
  const newSubInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) { setSubActivities([]); setSelectedSubIds([]); return; }
    fetch(`/api/activities/${selectedId}/sub-activities`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSubActivities(data);
          setSelectedSubIds([]);
        }
      })
      .catch(() => {});
  }, [selectedId]);

  const handleAdd = async () => {
    if (!selectedId) { setError('Please select an activity'); return; }
    if (!timeSlot) { setError('Please enter a time'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: Number(selectedId),
          date,
          time_slot: timeSlot,
          duration_minutes: Number(duration) || 30,
          sub_activity_ids: selectedSubIds,
          custom_sub_labels: customSubLabels,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to add');
      }
      await onAdded();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const grouped = activities.reduce<Record<string, Activity[]>>((acc, a) => {
    const cat = a.category ?? 'Other';
    (acc[cat] ??= []).push(a);
    return acc;
  }, {});

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent id="add-activity-modal">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="add-activity-select">Activity</Label>
            <select
              id="add-activity-select"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select an activity...</option>
              {Object.entries(grouped).map(([cat, acts]) => (
                <optgroup key={cat} label={cat}>
                  {acts.map(a => (
                    <option key={a.id} value={String(a.id)}>{a.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add-activity-time">Time</Label>
              <Input
                id="add-activity-time"
                type="time"
                value={timeSlot}
                onChange={e => setTimeSlot(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-activity-duration">Duration (min)</Label>
              <Input
                id="add-activity-duration"
                type="number"
                min="5"
                max="240"
                step="5"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div id="add-activity-subactivities">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtasks</p>
            {subActivities.length > 0 && (
              <div className="border rounded-lg divide-y max-h-36 overflow-y-auto mb-2">
                {subActivities.map(s => (
                  <label
                    key={s.id}
                    id={`subactivity-check-${s.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubIds.includes(s.id)}
                      onChange={e =>
                        setSelectedSubIds(prev =>
                          e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                        )
                      }
                      className="h-4 w-4 rounded accent-red-600"
                    />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
            )}
            {customSubLabels.length > 0 && (
              <div className="space-y-1 mb-2">
                {customSubLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded border bg-white dark:bg-gray-800 text-sm">
                    <span className="flex-1">{label}</span>
                    <button
                      type="button"
                      onClick={() => setCustomSubLabels(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-1 text-gray-400 hover:text-red-500"
                      aria-label={`Remove ${label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                ref={newSubInputRef}
                placeholder="Add a subtask... (Enter to add)"
                value={newSubLabel}
                onChange={e => setNewSubLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSubLabel.trim()) {
                      setCustomSubLabels(prev => [...prev, newSubLabel.trim()]);
                      setNewSubLabel('');
                    }
                  }
                }}
                className="text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (newSubLabel.trim()) {
                    setCustomSubLabels(prev => [...prev, newSubLabel.trim()]);
                    setNewSubLabel('');
                    newSubInputRef.current?.focus();
                  }
                }}
                aria-label="Add subtask"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {error && <p id="add-activity-error" className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} id="add-activity-cancel">Cancel</Button>
          <Button onClick={handleAdd} disabled={saving} id="add-activity-submit">
            {saving ? 'Adding...' : 'Add Activity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
