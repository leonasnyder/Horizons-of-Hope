'use client';
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(() => {});
  }, []);

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
