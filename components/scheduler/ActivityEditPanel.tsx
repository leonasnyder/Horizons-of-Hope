'use client';
import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Category { id: number; name: string; color: string; }
interface SubActivity { id: number; label: string; sort_order: number; }

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

  // Recurring schedule state
  const [isDefault, setIsDefault] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>(ALL_DAYS);
  const [defaultTime, setDefaultTime] = useState('09:00');
  const [defaultDuration, setDefaultDuration] = useState(30);

  useEffect(() => {
    // Load activity details (including defaults)
    fetch(`/api/activities/${activityId}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.defaults) {
          setIsDefault(true);
          setDefaultTime(data.defaults.default_time ?? '09:00');
          setDefaultDuration(data.defaults.default_duration ?? 30);
          setSelectedDays(parseDays(data.defaults.days_of_week));
        } else if (data) {
          setIsDefault(!!data.is_default);
        }
      })
      .catch(() => {});

    // Load sub-activities
    fetch(`/api/activities/${activityId}/sub-activities`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSubActivities(data); })
      .catch(() => {});
  }, [activityId]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const isAllDays = selectedDays.length === 7;

  const handleAllDays = () => {
    setSelectedDays(isAllDays ? [] : ALL_DAYS);
  };

  const save = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (isDefault && selectedDays.length === 0) {
      toast.error('Select at least one day for the recurring schedule');
      return;
    }
    setSaving(true);
    try {
      const daysValue = isDefault
        ? (isAllDays ? null : selectedDays.sort().join(','))
        : null;

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
            default_time: defaultTime,
            default_duration: defaultDuration,
            days_of_week: daysValue,
          } : {}),
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
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Repeat on</p>
              <div className="flex flex-wrap gap-1">
                {DAY_LABELS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      selectedDays.includes(i)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAllDays}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    isAllDays
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-orange-300'
                  }`}
                >
                  Every day
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <div>
                <Label htmlFor={`edit-time-${activityId}`} className="text-xs">Default time</Label>
                <Input
                  id={`edit-time-${activityId}`}
                  type="time"
                  value={defaultTime}
                  onChange={e => setDefaultTime(e.target.value)}
                  className="mt-1 w-32"
                />
              </div>
              <div>
                <Label htmlFor={`edit-duration-${activityId}`} className="text-xs">Duration (min)</Label>
                <Input
                  id={`edit-duration-${activityId}`}
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  value={defaultDuration}
                  onChange={e => setDefaultDuration(Number(e.target.value))}
                  className="mt-1 w-24"
                />
              </div>
            </div>
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
