'use client';
import { useState, useEffect } from 'react';
import { Plus, Archive, Search, RotateCcw, Tags, Edit2 } from 'lucide-react';
import CategoryManager from './CategoryManager';
import ActivityEditPanel from './ActivityEditPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

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

  const fetchActivities = () => {
    fetch('/api/activities?includeArchived=true')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data); })
      .catch(() => {});
  };

  const fetchCategories = () => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
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

  const archiveActivity = async (a: Activity) => {
    if (!window.confirm(`Archive "${a.name}"? It will be hidden from new schedules.`)) return;
    await fetch(`/api/activities/${a.id}`, { method: 'DELETE' });
    fetchActivities();
    toast.success(`${a.name} archived`);
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
          default_time: newActivity.default_time,
          default_duration: newActivity.default_duration,
        }),
      });
      if (!res.ok) throw new Error();
      fetchActivities();
      setAdding(false);
      setNewActivity({ name: '', description: '', category: '', color: '#F97316', is_default: false, default_time: '09:00', default_duration: 30 });
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent id="activity-manager" className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Activities</DialogTitle>
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
          <Button id="activity-manager-categories" size="sm" variant="outline" onClick={() => setCategoryManagerOpen(true)}>
            <Tags className="h-4 w-4 mr-1" /> Categories
          </Button>
          <Button id="activity-manager-add" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        {adding && (
          <div id="activity-manager-form" className="border rounded-lg p-4 mb-4 bg-orange-50 dark:bg-orange-950/30 space-y-3 flex-shrink-0">
            <h3 className="font-semibold text-sm text-orange-800 dark:text-orange-300">New Activity</h3>
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
              <div>
                <Label htmlFor="new-activity-time">Default Time</Label>
                <Input
                  id="new-activity-time"
                  type="time"
                  value={newActivity.default_time}
                  onChange={e => setNewActivity(p => ({ ...p, default_time: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-activity-duration">Default Duration (min)</Label>
                <Input
                  id="new-activity-duration"
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  value={newActivity.default_duration}
                  onChange={e => setNewActivity(p => ({ ...p, default_duration: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  id="new-activity-default"
                  checked={newActivity.is_default}
                  onCheckedChange={v => setNewActivity(p => ({ ...p, is_default: v }))}
                />
                <Label htmlFor="new-activity-default">Include in daily auto-schedule</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setAdding(false); setErrors({}); }} id="new-activity-cancel">Cancel</Button>
              <Button size="sm" onClick={createActivity} id="new-activity-submit">Create Activity</Button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {Object.entries(grouped).map(([cat, acts]) => (
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
                        <Button
                          id={`activity-restore-${a.id}`}
                          variant="outline"
                          size="sm"
                          onClick={() => unarchiveActivity(a)}
                          className="flex-shrink-0"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Restore
                        </Button>
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

      <CategoryManager
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        onChanged={fetchCategories}
      />
    </Dialog>
  );
}
