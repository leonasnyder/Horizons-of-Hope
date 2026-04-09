'use client';
import { useState, useEffect } from 'react';
import { Plus, Archive, Search, RotateCcw, Tags, Edit2, Trash2, X, BookOpen } from 'lucide-react';
import CategoryManager from './CategoryManager';
import ActivityEditPanel from './ActivityEditPanel';
import TaskLibraryPicker from './TaskLibraryPicker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

interface Activity {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  color: string;
  is_default: number;
  is_archived: number;
}

interface ActivityManagerProps {
  open: boolean;
  onClose: () => void;
}

interface Category { id: number; name: string; color: string; sort_order: number; }

export default function ActivityManager({ open, onClose }: ActivityManagerProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newActivity, setNewActivity] = useState({
    name: '', description: '', category: '', color: '#F97316',
    is_default: false, default_time: '09:00', default_duration: 30,
  });
  const [newActivitySlots, setNewActivitySlots] = useState<Array<{ time: string; duration: number; days: number[] }>>([
    { time: '09:00', duration: 30, days: ALL_DAYS },
  ]);
  const [newSubActivities, setNewSubActivities] = useState<string[]>([]);
  const [newSubLabel, setNewSubLabel] = useState('');
  const [showNewLibrary, setShowNewLibrary] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  const fetchActivities = () => {
    fetch('/api/activities?includeArchived=true')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(() => {});
  };

  const fetchCategories = () => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  };

  useEffect(() => {
    if (open) {
      fetchActivities();
      fetchCategories();
    }
  }, [open]);

  const filtered = activities.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleDefault = async (a: Activity) => {
    await fetch(`/api/activities/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: a.is_default ? 0 : 1 }),
    });
    fetchActivities();
    toast.success(`${a.name} ${a.is_default ? 'removed from' : 'added to'} daily defaults`);
  };

  const archiveActivity = (a: Activity) => {
    setConfirmDialog({
      title: `Archive "${a.name}"?`,
      message: 'It will be hidden from new schedules but can be restored later.',
      onConfirm: async () => {
        await fetch(`/api/activities/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_archived: 1 }),
        });
        fetchActivities();
        toast.success(`${a.name} archived`);
      },
    });
  };

  const deleteActivity = (a: Activity) => {
    setConfirmDialog({
      title: `Delete "${a.name}"?`,
      message: 'This will permanently delete the activity and cannot be undone.',
      onConfirm: async () => {
        await fetch(`/api/activities/${a.id}`, { method: 'DELETE' });
        fetchActivities();
        toast.success(`${a.name} deleted`);
      },
    });
  };

  const unarchiveActivity = async (a: Activity) => {
    await fetch(`/api/activities/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: 0 }),
    });
    fetchActivities();
    toast.success(`${a.name} restored`);
  };

  const validateNew = () => {
    const errs: Record<string, string> = {};
    if (!newActivity.name.trim()) errs.name = 'Name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createActivity = async () => {
    if (!validateNew()) return;
    if (newActivity.is_default) {
      for (const s of newActivitySlots) {
        if (s.days.length === 0) {
          toast.error('Each time slot needs at least one day selected');
          return;
        }
      }
    }
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newActivity.name.trim(),
          description: newActivity.description.trim() || null,
          category: newActivity.category || null,
          color: newActivity.color,
          is_default: newActivity.is_default ? 1 : 0,
          defaults: newActivity.is_default ? newActivitySlots.map(s => ({
            default_time: s.time,
            default_duration: s.duration,
            days_of_week: s.days.length === 7 ? null : s.days.sort().join(','),
          })) : [],
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      if (newSubActivities.length > 0) {
        for (const label of newSubActivities) {
          await fetch(`/api/activities/${created.id}/sub-activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label }),
          });
        }
      }
      fetchActivities();
      setAdding(false);
      setNewActivity({ name: '', description: '', category: '', color: '#F97316', is_default: false, default_time: '09:00', default_duration: 30 });
      setNewActivitySlots([{ time: '09:00', duration: 30, days: ALL_DAYS }]);
      setNewSubActivities([]);
      setNewSubLabel('');
      setErrors({});
      toast.success('Activity created');
    } catch {
      toast.error('Failed to create activity');
    }
  };

  const grouped = filtered.reduce<Record<string, Activity[]>>((acc, a) => {
    const key = a.is_archived ? '\u2399 Archived' : (a.category ?? 'Other');
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

  return (
  <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent id="activity-manager" className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Manage Activities</DialogTitle>
            <Button id="activity-manager-categories" variant="outline" size="sm" onClick={() => setCategoryManagerOpen(true)} className="flex-shrink-0">
              <Tags className="h-4 w-4 mr-1" /> Manage Categories
            </Button>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              id="activity-manager-search"
              className="pl-9"
              placeholder="Search activities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button id="activity-manager-add" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Activity
          </Button>
        </div>

        {adding && (
          <div id="activity-manager-form" className="border rounded-lg p-4 mb-4 bg-red-50 dark:bg-red-950/30 space-y-3 flex-shrink-0 overflow-y-auto max-h-[70vh]">
            <h3 className="font-semibold text-sm text-red-800 dark:text-red-400">New Activity</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-activity-name">Name *</Label>
                <Input
                  id="new-activity-name"
                  value={newActivity.name}
                  onChange={e => setNewActivity(p => ({ ...p, name: e.target.value }))}
                  className="mt-1"
                  onKeyDown={e => e.key === 'Enter' && createActivity()}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="new-activity-category">Category</Label>
                <select
                  id="new-activity-category"
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1"
                  value={newActivity.category}
                  onChange={e => setNewActivity(p => ({ ...p, category: e.target.value }))}
                >
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="new-activity-description">Description</Label>
                <Input
                  id="new-activity-description"
                  value={newActivity.description}
                  onChange={e => setNewActivity(p => ({ ...p, description: e.target.value }))}
                  className="mt-1"
                  placeholder="Optional description..."
                />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="new-activity-default"
                    checked={newActivity.is_default}
                    onCheckedChange={v => setNewActivity(p => ({ ...p, is_default: v }))}
                  />
                  <Label htmlFor="new-activity-default">Auto-schedule (recurring)</Label>
                </div>
                {newActivity.is_default && (
                  <div className="space-y-3 pt-1">
                    {newActivitySlots.map((slot, i) => (
                      <div key={i} className="border rounded-lg p-3 bg-white dark:bg-gray-900 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">
                            Time slot {newActivitySlots.length > 1 ? i + 1 : ''}
                          </span>
                          {newActivitySlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setNewActivitySlots(prev => prev.filter((_, idx) => idx !== i))}
                              className="p-1 text-gray-400 hover:text-red-500"
                              aria-label="Remove time slot"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <div>
                            <Label className="text-xs">Time</Label>
                            <Input
                              type="time"
                              value={slot.time}
                              onChange={e => setNewActivitySlots(prev => prev.map((s, idx) => idx === i ? { ...s, time: e.target.value } : s))}
                              className="mt-1 w-32"
                            />
                            {slot.time && (
                              <p className="text-xs text-red-700 mt-0.5 font-medium">
                                {(() => { const [h, m] = slot.time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; })()}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">Duration (min)</Label>
                            <Input
                              type="number"
                              min="5"
                              max="240"
                              step="5"
                              value={slot.duration}
                              onChange={e => setNewActivitySlots(prev => prev.map((s, idx) => idx === i ? { ...s, duration: Number(e.target.value) } : s))}
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
                                onClick={() => setNewActivitySlots(prev => prev.map((s, idx) => {
                                  if (idx !== i) return s;
                                  const days = s.days.includes(d) ? s.days.filter(x => x !== d) : [...s.days, d].sort();
                                  return { ...s, days };
                                }))}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                  slot.days.includes(d)
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-white dark:bg-gray-700 text-gray-600 border-gray-200 hover:border-red-400'
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setNewActivitySlots(prev => prev.map((s, idx) => idx === i ? { ...s, days: s.days.length === 7 ? [] : ALL_DAYS } : s))}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                slot.days.length === 7
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'text-gray-500 border-gray-200 hover:border-red-400'
                              }`}
                            >
                              Every day
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewActivitySlots(prev => [...prev, { time: '09:00', duration: 30, days: ALL_DAYS }])}
                      className="w-full"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add another time
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Sub-activities</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewLibrary(v => !v)}
                  className="h-7 text-xs gap-1"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  {showNewLibrary ? 'Hide Library' : 'Browse Library'}
                </Button>
              </div>
              {showNewLibrary && (
                <div className="mb-3">
                  <TaskLibraryPicker
                    selectedLabels={newSubActivities}
                    onAdd={label => {
                      if (!newSubActivities.some(l => l.toLowerCase() === label.toLowerCase())) {
                        setNewSubActivities(prev => [...prev, label]);
                      }
                    }}
                    onRemove={label => {
                      setNewSubActivities(prev => prev.filter(l => l.toLowerCase() !== label.toLowerCase()));
                    }}
                    onClose={() => setShowNewLibrary(false)}
                  />
                </div>
              )}
              {newSubActivities.length > 0 && (
                <div className="space-y-1 mb-2">
                  {newSubActivities.map((label, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded border bg-white dark:bg-gray-800 text-sm">
                      <span className="flex-1">{label}</span>
                      <button
                        type="button"
                        onClick={() => setNewSubActivities(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 text-gray-400 hover:text-red-500 min-w-[32px] min-h-[32px] flex items-center justify-center rounded"
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
                  placeholder="Add sub-activity..."
                  value={newSubLabel}
                  onChange={e => setNewSubLabel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSubLabel.trim()) {
                      e.preventDefault();
                      setNewSubActivities(prev => [...prev, newSubLabel.trim()]);
                      setNewSubLabel('');
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (newSubLabel.trim()) {
                      setNewSubActivities(prev => [...prev, newSubLabel.trim()]);
                      setNewSubLabel('');
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setAdding(false); setErrors({}); setNewSubActivities([]); setNewSubLabel(''); setNewActivitySlots([{ time: '09:00', duration: 30, days: ALL_DAYS }]); }} id="new-activity-cancel">Cancel</Button>
              <Button size="sm" onClick={createActivity} id="new-activity-submit">Create Activity</Button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {Object.entries(grouped).sort(([a], [b]) => {
            if (a.includes('Archived')) return 1;
            if (b.includes('Archived')) return -1;
            return a.localeCompare(b);
          }).map(([cat, acts]) => (
            <div key={cat} id={`activity-group-${cat.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 sticky top-0 bg-background py-1">{cat}</h3>
              <div className="space-y-1.5">
                {acts.map(a => (
                  <div key={a.id}>
                    <div
                      id={`activity-item-${a.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${a.is_archived ? 'text-gray-400' : ''}`}>{a.name}</p>
                        {a.description && <p className="text-xs text-gray-500 truncate">{a.description}</p>}
                      </div>
                      {!a.is_archived && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400 hidden sm:block">Auto</span>
                          <Switch
                            id={`activity-default-${a.id}`}
                            checked={!!a.is_default}
                            onCheckedChange={() => toggleDefault(a)}
                            aria-label={`Toggle auto-schedule for ${a.name}`}
                          />
                        </div>
                      )}
                      {!a.is_archived && (
                        <Button
                          id={`activity-edit-${a.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingActivityId(editingActivityId === a.id ? null : a.id)}
                          aria-label={`Edit ${a.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {a.is_archived ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            id={`activity-restore-${a.id}`}
                            variant="outline"
                            size="sm"
                            onClick={() => unarchiveActivity(a)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Restore
                          </Button>
                          <Button
                            id={`activity-delete-${a.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteActivity(a)}
                            className="text-gray-400 hover:text-red-500"
                            aria-label={`Delete ${a.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          id={`activity-archive-${a.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveActivity(a)}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0"
                          aria-label={`Archive ${a.name}`}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {editingActivityId === a.id && (
                      <ActivityEditPanel
                        activityId={a.id}
                        initialName={a.name}
                        initialDescription={a.description}
                        initialCategory={a.category}
                        initialColor={a.color}
                        categories={categories}
                        onSaved={() => { setEditingActivityId(null); fetchActivities(); }}
                        onCancel={() => setEditingActivityId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div id="activity-manager-empty" className="text-center text-gray-400 py-12">
              <p className="text-sm">{search ? 'No activities match your search' : 'No activities yet'}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <CategoryManager
      open={categoryManagerOpen}
      onClose={() => setCategoryManagerOpen(false)}
      onChanged={fetchCategories}
    />

    <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmDialog?.title}</DialogTitle>
          <DialogDescription>{confirmDialog?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
