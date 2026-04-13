'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react';

interface Activity { id: number; name: string; category: string | null; }
interface LibraryItem { id: number; label: string; }
interface LibraryCategory { id: number; name: string; items: LibraryItem[]; }

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

  // Library tags state
  const [libraryCategories, setLibraryCategories] = useState<LibraryCategory[]>([]);
  const [selectedLibraryLabels, setSelectedLibraryLabels] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(() => {});

    fetch('/api/task-library')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLibraryCategories(data);
          // Start all categories collapsed so users see the full list at a glance
          setExpandedCategories(new Set());
        }
      })
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

  const toggleLibraryTag = (label: string) => {
    setSelectedLibraryLabels(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleCategory = (id: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!selectedId) { setError('Please select an activity'); return; }
    if (!timeSlot) { setError('Please enter a time'); return; }
    setSaving(true);
    setError('');
    try {
      // Merge manually typed labels + selected library tags
      const allCustomLabels = [
        ...customSubLabels,
        ...Array.from(selectedLibraryLabels),
      ];

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: Number(selectedId),
          date,
          time_slot: timeSlot,
          duration_minutes: Number(duration) || 30,
          sub_activity_ids: selectedSubIds,
          custom_sub_labels: allCustomLabels,
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

  const totalSelected = selectedSubIds.length + customSubLabels.length + selectedLibraryLabels.size;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent id="add-activity-modal" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">

          {/* Activity selector */}
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

          {/* Time + Duration */}
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

          {/* Pre-defined sub-activities (from activity definition) */}
          <div id="add-activity-subactivities">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subtasks
              {totalSelected > 0 && (
                <span className="ml-2 text-xs text-gray-400 font-normal">{totalSelected} selected</span>
              )}
            </p>
            {subActivities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {subActivities.map(s => {
                  const isSelected = selectedSubIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setSelectedSubIds(prev =>
                          isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        )
                      }
                      style={{ WebkitAppearance: 'none', appearance: 'none' }}
                      className={`
                        inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                        border transition-all cursor-pointer select-none
                        ${isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:text-orange-600 active:bg-gray-100'
                        }
                      `}
                    >
                      {isSelected && <span>✓</span>}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom typed labels */}
            {customSubLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {customSubLabels.map((label, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => setCustomSubLabels(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500 ml-0.5"
                      aria-label={`Remove ${label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Custom input */}
            <div className="flex gap-2">
              <Input
                ref={newSubInputRef}
                placeholder="Add a custom subtask... (Enter to add)"
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

          {/* Library Tags — chips from the task library */}
          {libraryCategories.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Library Tags
                  {selectedLibraryLabels.size > 0 && (
                    <span className="ml-2 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 px-1.5 py-0.5 rounded-full font-semibold">
                      {selectedLibraryLabels.size} selected
                    </span>
                  )}
                </p>
                {selectedLibraryLabels.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedLibraryLabels(new Set())}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden divide-y dark:divide-gray-700 dark:border-gray-700">
                {libraryCategories.map(cat => (
                  <div key={cat.id}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {cat.name}
                        {cat.items.filter(i => selectedLibraryLabels.has(i.label)).length > 0 && (
                          <span className="ml-1.5 text-red-600 dark:text-red-400">
                            ({cat.items.filter(i => selectedLibraryLabels.has(i.label)).length})
                          </span>
                        )}
                      </span>
                      {expandedCategories.has(cat.id)
                        ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                      }
                    </button>
                    {expandedCategories.has(cat.id) && cat.items.length > 0 && (
                      <div className="px-3 py-2.5 flex flex-wrap gap-2">
                        {cat.items.map(item => {
                          const isSelected = selectedLibraryLabels.has(item.label);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleLibraryTag(item.label)}
                              style={{ WebkitAppearance: 'none', appearance: 'none' }}
                              className={`
                                inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                                border transition-all cursor-pointer select-none
                                ${isSelected
                                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-600 active:bg-gray-100'
                                }
                              `}
                            >
                              {isSelected && <span className="text-white">✓</span>}
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
