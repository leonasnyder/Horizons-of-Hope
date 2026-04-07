'use client';
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

export default function EditEntryModal({ entry, onClose, onSave }: EditEntryModalProps) {
  const [timeSlot, setTimeSlot] = useState(entry.time_slot);
  const [duration, setDuration] = useState(String(entry.duration_minutes));
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sub-activities
  const [availableSubs, setAvailableSubs] = useState<{ id: number; label: string }[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>(
    entry.entry_sub_activities
      .filter(s => s.sub_activity_id != null)
      .map(s => s.sub_activity_id as number)
  );

  useEffect(() => {
    if (!entry.activity_id) return;
    fetch(`/api/activities/${entry.activity_id}/sub-activities`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAvailableSubs(data); })
      .catch(() => {});
  }, [entry.activity_id]);

  const handleSave = async () => {
    if (!timeSlot) { setError('Time is required'); return; }
    const dur = Number(duration);
    if (isNaN(dur) || dur < 5 || dur > 240) { setError('Duration must be between 5 and 240 minutes'); return; }
    setSaving(true);
    setError('');
    try {
      // Update sub-activities first
      await fetch(`/api/schedule/${entry.id}/sub-activities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sub_activity_ids: selectedSubIds }),
      });
      await onSave({ time_slot: timeSlot, duration_minutes: dur, notes: notes.trim() || null });
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
      <DialogContent id="edit-entry-modal">
        <DialogHeader>
          <DialogTitle>Edit: {entry.activity_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
                      className="h-4 w-4 rounded accent-orange-500"
                    />
                    <span className="text-sm">{sub.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
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
