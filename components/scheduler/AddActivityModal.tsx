'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, X, ChevronDown, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Activity { id: number; name: string; category: string | null; }
interface LibraryItem { id: number; label: string; }
interface LibraryCategory { id: number; name: string; items: LibraryItem[]; }
interface Category { id: number; name: string; color: string; }

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

interface AddActivityModalProps {
  date: string;
  defaultSlot: string;
  onClose: () => void;
  onAdded: () => Promise<void>;
}

export default function AddActivityModal({ date, defaultSlot, onClose, onAdded }: AddActivityModalProps) {
  // Mode: 'select' = pick existing activity, 'create' = make a new one
  const [mode, setMode] = useState<'select' | 'create'>('select');

  // ── Select mode state ──────────────────────────────────────────
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

  // ── Create mode state ──────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newColor, setNewColor] = useState('#F97316');
  const [newTimeSlot, setNewTimeSlot] = useState(defaultSlot);
  const [newDuration, setNewDuration] = useState('30');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [newSlots, setNewSlots] = useState<Array<{ time: string; duration: number; days: number[] }>>([
    { time: defaultSlot, duration: 30, days: ALL_DAYS },
  ]);
  const [newSubActivities, setNewSubActivities] = useState<string[]>([]);
  const [newSubLabelInput, setNewSubLabelInput] = useState('');
  const [saveToList, setSaveToList] = useState(true);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Library for create mode
  const [createLibrarySelected, setCreateLibrarySelected] = useState<Set<string>>(new Set());
  const [createLibraryExpanded, setCreateLibraryExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(() => {});

    fetch('/api/task-library')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLibraryCategories(data);
      })
      .catch(() => {});

    fetch('/api/categories')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) { setSubActivities([]); setSelectedSubIds([]); return; }
    fetch(`/api/activities/${selectedId}/sub-activities`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) { setSubActivities(data); setSelectedSubIds([]); }
      })
      .catch(() => {});
  }, [selectedId]);

  // ── Select mode handlers ───────────────────────────────────────
  const toggleLibraryTag = (label: string) => {
    setSelectedLibraryLabels(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const toggleCategory = (id: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!selectedId) { setError('Please select an activity'); return; }
    if (!timeSlot) { setError('Please enter a time'); return; }
    setSaving(true);
    setError('');
    try {
      const allCustomLabels = [...customSubLabels, ...Array.from(selectedLibraryLabels)];
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

  // ── Create mode handlers ───────────────────────────────────────
  const toggleCreateLibraryTag = (label: string) => {
    setCreateLibrarySelected(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
    // Also add to newSubActivities for saving with the activity
    setNewSubActivities(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const toggleCreateCategory = (id: number) => {
    setCreateLibraryExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) { setCreateError('Activity name is required'); return; }
    if (!newTimeSlot) { setCreateError('Please enter a time'); return; }
    if (newIsDefault) {
      for (const s of newSlots) {
        if (s.days.length === 0) {
          setCreateError('Each time slot needs at least one day selected');
          return;
        }
      }
    }
    setCreating(true);
    setCreateError('');
    try {
      let activityId: number;

      if (saveToList) {
        // Create and save to activity list
        const res = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName.trim(),
            description: newDescription.trim() || null,
            category: newCategory || null,
            color: newColor,
            is_default: newIsDefault ? 1 : 0,
            defaults: newIsDefault ? newSlots.map(s => ({
              default_time: s.time,
              default_duration: s.duration,
              days_of_week: s.days.length === 7 ? null : s.days.sort().join(','),
            })) : [],
          }),
        });
        if (!res.ok) throw new Error('Failed to create activity');
        const created = await res.json();
        activityId = created.id;

        // Save sub-activities
        for (const label of newSubActivities) {
          await fetch(`/api/activities/${activityId}/sub-activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label }),
          });
        }
      } else {
        // Create activity temporarily (still needs to exist in DB for the schedule entry)
        const res = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName.trim(),
            description: newDescription.trim() || null,
            category: newCategory || null,
            color: newColor,
            is_default: 0,
            defaults: [],
          }),
        });
        if (!res.ok) throw new Error('Failed to create activity');
        const created = await res.json();
        activityId = created.id;
      }

      // Add to today's schedule
      const schedRes = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityId,
          date,
          time_slot: newTimeSlot,
          duration_minutes: Number(newDuration) || 30,
          sub_activity_ids: [],
          custom_sub_labels: newSubActivities,
        }),
      });
      if (!schedRes.ok) throw new Error('Failed to add to schedule');

      toast.success(`"${newName.trim()}" added to your schedule${saveToList ? ' and activity list' : ''}`);
      await onAdded();
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent id="add-activity-modal" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' && (
              <button
                type="button"
                onClick={() => setMode('select')}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 -ml-1"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {mode === 'select' ? 'Add Activity' : 'Create New Activity'}
          </DialogTitle>
        </DialogHeader>

        {/* ── SELECT MODE ─────────────────────────────────────── */}
        {mode === 'select' && (
          <>
            <div className="space-y-4 py-2">
              {/* Activity selector + Create New button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="add-activity-select">Activity</Label>
                  <button
                    type="button"
                    onClick={() => setMode('create')}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create New
                  </button>
                </div>
                <select
                  id="add-activity-select"
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <Input id="add-activity-time" type="time" value={timeSlot}
                    onChange={e => setTimeSlot(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="add-activity-duration">Duration (min)</Label>
                  <Input id="add-activity-duration" type="number" min="5" max="240" step="5"
                    value={duration} onChange={e => setDuration(e.target.value)} className="mt-1" />
                </div>
              </div>

              {/* Pre-defined sub-activities */}
              <div id="add-activity-subactivities">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtasks</p>
                {subActivities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {subActivities.map(s => {
                      const isSelected = selectedSubIds.includes(s.id);
                      return (
                        <button key={s.id} type="button"
                          onClick={() => setSelectedSubIds(prev => isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                          style={{ WebkitAppearance: 'none', appearance: 'none' }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none ${isSelected ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:text-orange-600 active:bg-gray-100'}`}
                        >
                          {isSelected && <span>✓</span>}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {customSubLabels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {customSubLabels.map((label, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        {label}
                        <button type="button" onClick={() => setCustomSubLabels(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-gray-400 hover:text-red-500 ml-0.5" aria-label={`Remove ${label}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input ref={newSubInputRef} placeholder="Add a custom subtask... (Enter to add)"
                    value={newSubLabel} onChange={e => setNewSubLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newSubLabel.trim()) { setCustomSubLabels(prev => [...prev, newSubLabel.trim()]); setNewSubLabel(''); } } }}
                    className="text-sm" />
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => { if (newSubLabel.trim()) { setCustomSubLabels(prev => [...prev, newSubLabel.trim()]); setNewSubLabel(''); newSubInputRef.current?.focus(); } }}
                    aria-label="Add subtask"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Library Tags */}
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
                      <button type="button" onClick={() => setSelectedLibraryLabels(new Set())}
                        className="text-xs text-gray-400 hover:text-red-500">Clear all</button>
                    )}
                  </div>
                  <div className="border rounded-lg overflow-hidden divide-y dark:divide-gray-700 dark:border-gray-700">
                    {libraryCategories.map(cat => (
                      <div key={cat.id}>
                        <button type="button" onClick={() => toggleCategory(cat.id)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {cat.name}
                            {cat.items.filter(i => selectedLibraryLabels.has(i.label)).length > 0 && (
                              <span className="ml-1.5 text-red-600 dark:text-red-400">
                                ({cat.items.filter(i => selectedLibraryLabels.has(i.label)).length})
                              </span>
                            )}
                          </span>
                          {expandedCategories.has(cat.id) ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                        </button>
                        {expandedCategories.has(cat.id) && cat.items.length > 0 && (
                          <div className="px-3 py-2.5 flex flex-wrap gap-2">
                            {cat.items.map(item => {
                              const isSelected = selectedLibraryLabels.has(item.label);
                              return (
                                <button key={item.id} type="button" onClick={() => toggleLibraryTag(item.label)}
                                  style={{ WebkitAppearance: 'none', appearance: 'none' }}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none ${isSelected ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-600 active:bg-gray-100'}`}>
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
          </>
        )}

        {/* ── CREATE MODE ─────────────────────────────────────── */}
        {mode === 'create' && (
          <>
            <div className="space-y-4 py-2">
              {/* Name + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="create-activity-name">Name *</Label>
                  <Input id="create-activity-name" value={newName}
                    onChange={e => setNewName(e.target.value)} className="mt-1" placeholder="e.g. Morning Circle" />
                </div>
                <div>
                  <Label htmlFor="create-activity-category">Category</Label>
                  <select id="create-activity-category" value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1">
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description + Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="create-activity-description">Description</Label>
                  <Input id="create-activity-description" value={newDescription}
                    onChange={e => setNewDescription(e.target.value)} className="mt-1" placeholder="Optional..." />
                </div>
                <div>
                  <Label htmlFor="create-activity-color">Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input id="create-activity-color" type="color" value={newColor}
                      onChange={e => setNewColor(e.target.value)}
                      className="h-11 w-14 rounded-lg border border-input cursor-pointer p-1" />
                    <span className="text-xs text-gray-500">{newColor}</span>
                  </div>
                </div>
              </div>

              {/* Time + Duration for today's schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="create-activity-time">Time (today)</Label>
                  <Input id="create-activity-time" type="time" value={newTimeSlot}
                    onChange={e => setNewTimeSlot(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="create-activity-duration">Duration (min)</Label>
                  <Input id="create-activity-duration" type="number" min="5" max="240" step="5"
                    value={newDuration} onChange={e => setNewDuration(e.target.value)} className="mt-1" />
                </div>
              </div>

              {/* Auto-schedule toggle */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch id="create-activity-default" checked={newIsDefault} onCheckedChange={setNewIsDefault} />
                  <Label htmlFor="create-activity-default">Auto-schedule (recurring)</Label>
                </div>
                {newIsDefault && (
                  <div className="space-y-3 pl-2">
                    {newSlots.map((slot, i) => (
                      <div key={i} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">
                            Time slot {newSlots.length > 1 ? i + 1 : ''}
                          </span>
                          {newSlots.length > 1 && (
                            <button type="button"
                              onClick={() => setNewSlots(prev => prev.filter((_, idx) => idx !== i))}
                              className="p-1 text-gray-400 hover:text-red-500" aria-label="Remove time slot">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <div>
                            <Label className="text-xs">Time</Label>
                            <Input type="time" value={slot.time}
                              onChange={e => setNewSlots(prev => prev.map((s, idx) => idx === i ? { ...s, time: e.target.value } : s))}
                              className="mt-1 w-32" />
                          </div>
                          <div>
                            <Label className="text-xs">Duration (min)</Label>
                            <Input type="number" min="5" max="240" step="5" value={slot.duration}
                              onChange={e => setNewSlots(prev => prev.map((s, idx) => idx === i ? { ...s, duration: Number(e.target.value) } : s))}
                              className="mt-1 w-24" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Repeat on</p>
                          <div className="flex flex-wrap gap-1">
                            {DAY_LABELS.map((day, d) => (
                              <button key={d} type="button"
                                onClick={() => setNewSlots(prev => prev.map((s, idx) => {
                                  if (idx !== i) return s;
                                  const days = s.days.includes(d) ? s.days.filter(x => x !== d) : [...s.days, d].sort();
                                  return { ...s, days };
                                }))}
                                style={{ WebkitAppearance: 'none', appearance: 'none' }}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${slot.days.includes(d) ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-gray-700 text-gray-600 border-gray-200 hover:border-red-400'}`}>
                                {day}
                              </button>
                            ))}
                            <button type="button"
                              onClick={() => setNewSlots(prev => prev.map((s, idx) => idx === i ? { ...s, days: s.days.length === 7 ? [] : ALL_DAYS } : s))}
                              style={{ WebkitAppearance: 'none', appearance: 'none' }}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${slot.days.length === 7 ? 'bg-red-600 text-white border-red-600' : 'text-gray-500 border-gray-200 hover:border-red-400'}`}>
                              Every day
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => setNewSlots(prev => [...prev, { time: '09:00', duration: 30, days: ALL_DAYS }])}
                      className="w-full">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add another time
                    </Button>
                  </div>
                )}
              </div>

              {/* Sub-activities from library */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sub-activities
                  {newSubActivities.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">{newSubActivities.length} added</span>
                  )}
                </p>

                {/* Library chips */}
                {libraryCategories.length > 0 && (
                  <div className="border rounded-lg overflow-hidden divide-y dark:divide-gray-700 dark:border-gray-700 mb-3">
                    {libraryCategories.map(cat => (
                      <div key={cat.id}>
                        <button type="button" onClick={() => toggleCreateCategory(cat.id)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-left">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {cat.name}
                            {cat.items.filter(i => createLibrarySelected.has(i.label)).length > 0 && (
                              <span className="ml-1.5 text-red-600 dark:text-red-400">
                                ({cat.items.filter(i => createLibrarySelected.has(i.label)).length})
                              </span>
                            )}
                          </span>
                          {createLibraryExpanded.has(cat.id) ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                        </button>
                        {createLibraryExpanded.has(cat.id) && cat.items.length > 0 && (
                          <div className="px-3 py-2.5 flex flex-wrap gap-2">
                            {cat.items.map(item => {
                              const isSelected = createLibrarySelected.has(item.label);
                              return (
                                <button key={item.id} type="button" onClick={() => toggleCreateLibraryTag(item.label)}
                                  style={{ WebkitAppearance: 'none', appearance: 'none' }}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none ${isSelected ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-600 active:bg-gray-100'}`}>
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
                )}

                {/* Custom typed sub-activities */}
                {newSubActivities.filter(l => !createLibrarySelected.has(l)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newSubActivities.filter(l => !createLibrarySelected.has(l)).map((label, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        {label}
                        <button type="button"
                          onClick={() => setNewSubActivities(prev => prev.filter(l2 => l2 !== label))}
                          className="text-gray-400 hover:text-red-500 ml-0.5" aria-label={`Remove ${label}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input placeholder="Add a custom sub-activity... (Enter to add)"
                    value={newSubLabelInput} onChange={e => setNewSubLabelInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newSubLabelInput.trim()) { e.preventDefault(); setNewSubActivities(prev => [...prev, newSubLabelInput.trim()]); setNewSubLabelInput(''); } }}
                    className="text-sm" />
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => { if (newSubLabelInput.trim()) { setNewSubActivities(prev => [...prev, newSubLabelInput.trim()]); setNewSubLabelInput(''); } }}
                    aria-label="Add sub-activity"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Save to activity list toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border">
                <Switch id="create-save-to-list" checked={saveToList} onCheckedChange={setSaveToList} />
                <div>
                  <Label htmlFor="create-save-to-list" className="cursor-pointer">Save to activity list</Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {saveToList ? 'Activity will be saved and available to reuse anytime' : 'Activity will only be added to today\'s schedule'}
                  </p>
                </div>
              </div>

              {createError && <p className="text-sm text-red-500">{createError}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMode('select')}>Back</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create & Add to Schedule'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
