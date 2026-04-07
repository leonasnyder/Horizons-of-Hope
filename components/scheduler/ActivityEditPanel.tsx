'use client';
import { useState, useEffect } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Category { id: number; name: string; color: string; }
interface SubActivity { id: number; label: string; sort_order: number; }

interface DefaultSlot {
  default_time: string;
  default_duration: number;
  days_of_week: string | null;
}

interface ActivityEditPanelProps {
  activityId: number;
  initialName: string;
  initialDescription: string | null;
  initialCategory: string | null;
  initialColor: string;
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function parseDays(daysOfWeek: string | null | undefined): number[] {
  if (!daysOfWeek) return ALL_DAYS;
  return daysOfWeek.split(',').map(Number).filter(n => !isNaN(n));
}

function formatPreview(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function ActivityEditPanel({
  activityId,
  initialName,
  initialDescription,
  initialCategory,
  initialColor,
  categories,
  onSaved,
  onCancel,
}: ActivityEditPanelProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [category, setCategory] = useState(initialCategory ?? '');
  const [color, setColor] = useState(initialColor);
  const [subActivities, setSubActivities] = useState<SubActivity[]>([]);
  const [newSubLabel, setNewSubLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  // Multiple time slots
  const [slots, setSlots] = useState<Array<{ time: string; duration: number; days: number[] }>>([
    { time: '09:00', duration: 30, days: ALL_DAYS },
  ]);

  useEffect(() => {
    fetch(`/api/activities/${activityId}`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.defaults) && data.defaults.length > 0) {
          setIsDefault(true);
          setSlots(data.defaults.map((d: DefaultSlot) => ({
            time: d.default_time ?? '09:00',
            duration: d.default_duration ?? 30,
            days: parseDays(d.days_of_week),
          })));
        } else if (data) {
          setIsDefault(!!data.is_default);
        }
      })
      .catch(() => {});

    fetch(`/api/activities/${activityId}/sub-activities`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSubActivities(data); })
      .catch(() => {});
  }, [activityId]);

  const updateSlot = (i: number, key: string, value: unknown) =>
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s));

  const addSlot = () =>
    setSlots(prev => [...prev, { time: '09:00', duration: 30, days: ALL_DAYS }]);

  const removeSlot = (i: number) =>
    setSlots(prev => prev.filter((_, idx) => idx !== i));

  const toggleDay = (slotIdx: number, day: number) => {
    setSlots(prev => prev.map((s, idx) => {
      if (idx !== slotIdx) return s;
      const days = s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day].sort();
      return { ...s, days };
    }));
  };

  const save = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (isDefault) {
      for (const s of slots) {
        if (s.days.length === 0) {
          toast.error('Each time slot needs at least one day selected');
          return;
        }
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category: category || null,
          color,
          is_default: isDefault ? 1 : 0,
          ...(isDefault ? {
            defaults: slots.map(s => ({
              default_time: s.time,
              default_duration: s.duration,
              days_of_week: s.days.length === 7 ? null : s.days.sort().join(','),
            })),
          } : { defaults: [] }),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Activity updated');
      onSaved();
    } catch {
      toast.error('Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const addSubActivity = async () => {
    if (!newSubLabel.trim()) return;
    try {
      const res = await fetch(`/api/activities/${activityId}/sub-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newSubLabel.trim() }),
      });
      if (!res.ok) throw new Error();
      const newSub = await res.json() as SubActivity;
      setSubActivities(prev => [...prev, newSub]);
      setNewSubLabel('');
    } catch {
      toast.error('Failed to add sub-activity');
    }
  };

  const removeSubActivity = async (subId: number) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/sub-activities/${subId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setSubActivities(prev => prev.filter(s => s.id !== subId));
    } catch {
      toast.error('Failed to remove sub-activity');
    }
  };

  return (
    <div id={`activity-edit-panel-${activityId}`}
      className="border rounded-lg p-4 mt-1 bg-blue-50 dark:bg-blue-950/30 space-y-4">

      {/* Name + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`edit-name-${activityId}`}>Name *</Label>
          <Input
            id={`edit-name-${activityId}`}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`edit-category-${activityId}`}>Category</Label>
          <select
            id={`edit-category-${activityId}`}
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1"
          >
            <option value="">No category</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <Label htmlFor={`edit-desc-${activityId}`}>Description</Label>
          <Input
            id={`edit-desc-${activityId}`}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1"
            placeholder="Optional description..."
          />
        </div>

        <div>
          <Label>Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="h-11 w-16 rounded border cursor-pointer"
              aria-label="Activity color"
            />
            <span className="text-sm text-gray-500">{color}</span>
          </div>
        </div>
      </div>

      {/* Recurring Schedule */}
      <div className="border rounded-lg p-3 bg-white dark:bg-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <Switch
            id={`edit-recurring-${activityId}`}
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
          <Label htmlFor={`edit-recurring-${activityId}`} className="font-medium">
            Auto-schedule (recurring)
          </Label>
        </div>

        {isDefault && (
          <div className="space-y-3 pt-1">
            {slots.map((slot, i) => (
              <div key={i} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">
                    Time slot {slots.length > 1 ? i + 1 : ''}
                  </span>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      aria-label="Remove this time slot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <div>
                    <Label htmlFor={`edit-time-${activityId}-${i}`} className="text-xs">Time</Label>
                    <Input
                      id={`edit-time-${activityId}-${i}`}
                      type="time"
                      value={slot.time}
                      onChange={e => updateSlot(i, 'time', e.target.value)}
                      className="mt-1 w-32"
                    />
                    {slot.time && (
                      <p className="text-xs text-orange-600 mt-0.5 font-medium">{formatPreview(slot.time)}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`edit-duration-${activityId}-${i}`} className="text-xs">Duration (min)</Label>
                    <Input
                      id={`edit-duration-${activityId}-${i}`}
                      type="number"
                      min="5"
                      max="240"
                      step="5"
                      value={slot.duration}
                      onChange={e => updateSlot(i, 'duration', Number(e.target.value))}
                      className="mt-1 w-24"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Repeat on</p>
                  <div className="flex flex-wrap gap-1">
                    {DAY_LABELS.map((day, d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(i, d)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          slot.days.includes(d)
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateSlot(i, 'days', slot.days.length === 7 ? [] : ALL_DAYS)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        slot.days.length === 7
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'text-gray-500 border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      Every day
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addSlot} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add another time
            </Button>
          </div>
        )}
      </div>

      {/* Sub-activities */}
      <div>
        <p id={`edit-subactivities-label-${activityId}`} className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
          Sub-activities
        </p>
        {subActivities.length > 0 && (
          <div id={`edit-subactivities-list-${activityId}`} className="space-y-1 mb-2">
            {subActivities.map(s => (
              <div key={s.id} id={`subactivity-item-${s.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded border bg-white dark:bg-gray-800 text-sm">
                <span className="flex-1">{s.label}</span>
                <button
                  id={`subactivity-remove-${s.id}`}
                  onClick={() => removeSubActivity(s.id)}
                  className="p-1 text-gray-400 hover:text-red-500 min-w-[32px] min-h-[32px] flex items-center justify-center rounded"
                  aria-label={`Remove ${s.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            id={`new-subactivity-${activityId}`}
            placeholder="Add sub-activity..."
            value={newSubLabel}
            onChange={e => setNewSubLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubActivity()}
          />
          <Button
            id={`add-subactivity-btn-${activityId}`}
            size="sm"
            variant="outline"
            onClick={addSubActivity}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button id={`edit-cancel-${activityId}`} variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button id={`edit-save-${activityId}`} size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
