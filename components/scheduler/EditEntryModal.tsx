'use client';
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, BookOpen, CalendarDays } from 'lucide-react';
import TaskLibraryPicker from './TaskLibraryPicker';

interface EntrySubActivity {
  id: number;
  sub_activity_id: number | null;
  label: string;
  completed: number;
}

interface EditEntryModalProps {
  entry: {
    id: number;
    activity_id: number;
    time_slot: string;
    duration_minutes: number;
    notes: string | null;
    activity_name: string;
    entry_sub_activities: EntrySubActivity[];
  };
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

// Normalize "HH:MM:SS" → "HH:MM" so browser time inputs compare correctly
function normalizeTime(t: string) { return t ? t.slice(0, 5) : t; }

export default function EditEntryModal({ entry, onClose, onSave }: EditEntryModalProps) {
  const initialTime = normalizeTime(entry.time_slot);
  const [timeSlot, setTimeSlot] = useState(initialTime);
  const [duration, setDuration] = useState(String(entry.duration_minutes));
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [updateFuture, setUpdateFuture] = useState(false);

  const timeChanged = timeSlot !== initialTime;
  const durationChanged = Number(duration) !== entry.duration_minutes;
  const timeOrDurationChanged = (timeChanged || durationChanged) && !!entry.activity_id;

  // Pre-defined sub-activities from the activity
  const [availableSubs, setAvailableSubs] = useState<{ id: number; label: string }[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>(
    entry.entry_sub_activities
      .filter(s => s.sub_activity_id != null)
      .map(s => s.sub_activity_id as number)
  );

  // Custom sub-activities (typed in or added from library)
  const [customLabels, setCustomLabels] = useState<string[]>(
    entry.entry_sub_activities
      .filter(s => s.sub_activity_id == null)
      .map(s => s.label)
  );
  const [newLabel, setNewLabel] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    if (!entry.activity_id) return;
    fetch(`/api/activities/${entry.activity_id}/sub-activities`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAvailableSubs(data); })
      .catch(() => {});
  }, [entry.activity_id]);

  const addCustomLabel = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (!customLabels.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
      setCustomLabels(prev => [...prev, trimmed]);
    }
    setNewLabel('');
  };

  const handleSave = async () => {
    if (!timeSlot) { setError('Time is required'); return; }
    const dur = Number(duration);
    if (isNaN(dur) || dur < 5 || dur > 240) { setError('Duration must be between 5 and 240 minutes'); return; }
    setSaving(true);
    setError('');
    try {
      await fetch(`/api/schedule/${entry.id}/sub-activities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sub_activity_ids: selectedSubIds, custom_labels: customLabels }),
      });
      await onSave({ time_slot: timeSlot, duration_minutes: dur, notes: notes.trim() || null, updateFuture: timeOrDurationChanged && updateFuture });
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleSub = (id: number) => {
    setSelectedSubIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent id="edit-entry-modal" className="flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit: {entry.activity_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div>
            <Label htmlFor="edit-entry-time">Time</Label>
            <Input
              id="edit-entry-time"
              type="time"
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edit-entry-duration">Duration (minutes)</Label>
            <Input
              id="edit-entry-duration"
              type="number"
              min="5"
              max="240"
              step="5"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="mt-1"
            />
          </div>
          {timeOrDurationChanged && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                <CalendarDays className="h-4 w-4 flex-shrink-0" />
                Apply time/duration change to:
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="update-scope"
                    checked={!updateFuture}
                    onChange={() => setUpdateFuture(false)}
                    className="accent-red-600"
                  />
                  Just today
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="update-scope"
                    checked={updateFuture}
                    onChange={() => setUpdateFuture(true)}
                    className="accent-red-600"
                  />
                  Today and all future occurrences
                </label>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="edit-entry-notes">Notes</Label>
            <Textarea
              id="edit-entry-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Pre-defined sub-activities from the activity */}
          {availableSubs.length > 0 && (
            <div>
              <Label>Sub-activities</Label>
              <div className="mt-1 space-y-1.5 border rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                {availableSubs.map(sub => (
                  <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSubIds.includes(sub.id)}
                      onChange={() => toggleSub(sub.id)}
                      className="h-4 w-4 rounded accent-red-600"
                    />
                    <span className="text-sm">{sub.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Custom sub-activities */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Add Tasks</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLibrary(v => !v)}
                className="h-7 text-xs gap-1"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {showLibrary ? 'Hide Library' : 'Browse Library'}
              </Button>
            </div>

            {showLibrary && (
              <div className="mb-3">
                <TaskLibraryPicker
                  selectedLabels={customLabels}
                  onAdd={label => {
                    if (!customLabels.some(l => l.toLowerCase() === label.toLowerCase())) {
                      setCustomLabels(prev => [...prev, label]);
                    }
                  }}
                  onRemove={label => {
                    setCustomLabels(prev => prev.filter(l => l.toLowerCase() !== label.toLowerCase()));
                  }}
                  onClose={() => setShowLibrary(false)}
                />
              </div>
            )}

            {customLabels.length > 0 && (
              <div className="space-y-1 mb-2">
                {customLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded border bg-white dark:bg-gray-800 text-sm">
                    <span className="flex-1">{label}</span>
                    <button
                      type="button"
                      onClick={() => setCustomLabels(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-1 text-gray-400 hover:text-red-500 min-w-[32px] min-h-[32px] flex items-center justify-center rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Add a task..."
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustomLabel(); }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addCustomLabel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error && <p id="edit-entry-error" className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} id="edit-entry-cancel">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} id="edit-entry-save">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
