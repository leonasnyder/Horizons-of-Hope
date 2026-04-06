'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Subcategory {
  id?: number;
  goal_id?: number;
  response_type: 'correct' | 'incorrect';
  label: string;
  sort_order: number;
  is_active?: number;
}

interface Goal {
  id: number;
  name: string;
  description: string | null;
  color: string;
  is_active: number;
  subcategories: Subcategory[];
}

interface GoalManagerProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export default function GoalManager({ open, onClose, onChanged }: GoalManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalColor, setNewGoalColor] = useState('#0EA5E9');
  const [newSubcatLabel, setNewSubcatLabel] = useState('');
  const [newSubcatType, setNewSubcatType] = useState<'correct' | 'incorrect'>('correct');

  const fetchGoals = () => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setGoals(data); })
      .catch(() => {});
  };

  useEffect(() => { if (open) fetchGoals(); }, [open]);

  const createGoal = async () => {
    if (!newGoalName.trim()) { toast.error('Goal name is required'); return; }
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGoalName.trim(),
          color: newGoalColor,
        }),
      });
      if (!res.ok) throw new Error();
      fetchGoals();
      onChanged();
      setNewGoalName('');
      toast.success('Goal created');
    } catch {
      toast.error('Failed to create goal');
    }
  };

  const archiveGoal = async (id: number, name: string) => {
    if (!window.confirm(`Archive "${name}"? Existing data is preserved.`)) return;
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    fetchGoals();
    onChanged();
    toast.success('Goal archived');
  };

  const restoreGoal = async (id: number) => {
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: 1 }),
    });
    fetchGoals();
    onChanged();
    toast.success('Goal restored');
  };

  const saveGoal = async () => {
    if (!editingGoal) return;
    if (!editingGoal.name.trim()) { toast.error('Goal name is required'); return; }
    try {
      await fetch(`/api/goals/${editingGoal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingGoal.name,
          description: editingGoal.description,
          color: editingGoal.color,
          subcategories: editingGoal.subcategories.map((s, i) => ({ ...s, sort_order: i })),
        }),
      });
      fetchGoals();
      onChanged();
      setEditingGoal(null);
      toast.success('Goal updated');
    } catch {
      toast.error('Failed to save goal');
    }
  };

  const addSubcat = () => {
    if (!editingGoal || !newSubcatLabel.trim()) return;
    setEditingGoal(g => g ? {
      ...g,
      subcategories: [
        ...g.subcategories,
        {
          response_type: newSubcatType,
          label: newSubcatLabel.trim(),
          sort_order: g.subcategories.length,
        },
      ],
    } : null);
    setNewSubcatLabel('');
  };

  const removeSubcat = (index: number) => {
    setEditingGoal(g => g ? {
      ...g,
      subcategories: g.subcategories.filter((_, i) => i !== index),
    } : null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent id="goal-manager" className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Goals</DialogTitle>
        </DialogHeader>

        {editingGoal ? (
          <div id="goal-editor" className="space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-goal-name">Goal Name *</Label>
                <Input
                  id="edit-goal-name"
                  value={editingGoal.name}
                  onChange={e => setEditingGoal(g => g ? { ...g, name: e.target.value } : null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-goal-color">Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    id="edit-goal-color"
                    type="color"
                    value={editingGoal.color}
                    onChange={e => setEditingGoal(g => g ? { ...g, color: e.target.value } : null)}
                    className="h-11 w-16 rounded-lg cursor-pointer border border-input"
                  />
                  <span className="text-sm text-gray-500 font-mono">{editingGoal.color}</span>
                </div>
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-goal-desc">Description</Label>
                <Input
                  id="edit-goal-desc"
                  value={editingGoal.description ?? ''}
                  onChange={e => setEditingGoal(g => g ? { ...g, description: e.target.value || null } : null)}
                  className="mt-1"
                  placeholder="Optional description..."
                />
              </div>
            </div>

            <div id="goal-editor-subcats">
              <p className="text-sm font-semibold mb-3">Subcategories</p>
              {(['correct', 'incorrect'] as const).map(type => (
                <div key={type} className="mb-4">
                  <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${
                    type === 'correct' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {type} responses
                  </p>
                  <div className="space-y-1">
                    {editingGoal.subcategories
                      .filter(s => s.response_type === type)
                      .map((s, globalIdx) => {
                        const realIdx = editingGoal.subcategories.indexOf(s);
                        return (
                          <div
                            key={globalIdx}
                            id={`subcat-item-${realIdx}`}
                            className="flex items-center gap-2 p-2 rounded-lg border bg-gray-50 dark:bg-gray-700"
                          >
                            <span className="flex-1 text-sm">{s.label}</span>
                            <button
                              onClick={() => removeSubcat(realIdx)}
                              className="p-1 text-red-400 hover:text-red-600 min-w-[32px] min-h-[32px] flex items-center justify-center rounded"
                              aria-label={`Remove ${s.label}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    {editingGoal.subcategories.filter(s => s.response_type === type).length === 0 && (
                      <p className="text-xs text-gray-400 py-1">No {type} subcategories yet</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Add subcategory row */}
              <div id="goal-editor-add-subcat" className="flex gap-2 mt-3">
                <select
                  id="new-subcat-type"
                  value={newSubcatType}
                  onChange={e => setNewSubcatType(e.target.value as 'correct' | 'incorrect')}
                  className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
                >
                  <option value="correct">Correct</option>
                  <option value="incorrect">Incorrect</option>
                </select>
                <Input
                  id="new-subcat-label"
                  placeholder="Subcategory label..."
                  value={newSubcatLabel}
                  onChange={e => setNewSubcatLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubcat()}
                  className="flex-1"
                />
                <Button id="new-subcat-add" size="sm" onClick={addSubcat} className="h-11">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setEditingGoal(null)} id="goal-editor-cancel">Cancel</Button>
              <Button onClick={saveGoal} id="goal-editor-save">Save Goal</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Create new goal row */}
            <div id="goal-manager-new" className="flex gap-2 mb-4">
              <Input
                id="new-goal-name"
                placeholder="New goal name..."
                value={newGoalName}
                onChange={e => setNewGoalName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createGoal()}
                className="flex-1"
              />
              <input
                type="color"
                value={newGoalColor}
                onChange={e => setNewGoalColor(e.target.value)}
                className="h-11 w-12 rounded-lg border border-input cursor-pointer"
                aria-label="Goal color"
              />
              <Button id="goal-manager-create" onClick={createGoal}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {/* Goal list */}
            <div className="overflow-y-auto flex-1 space-y-2">
              {goals.map(g => (
                <div
                  key={g.id}
                  id={`goal-manager-item-${g.id}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800 ${
                    !g.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: g.color }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-gray-500">
                      {g.subcategories?.length ?? 0} subcategories
                      {!g.is_active && ' · Archived'}
                    </p>
                  </div>
                  <Button
                    id={`goal-edit-${g.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingGoal(g)}
                    aria-label={`Edit ${g.name}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {g.is_active ? (
                    <Button
                      id={`goal-archive-${g.id}`}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-600"
                      onClick={() => archiveGoal(g.id, g.name)}
                      aria-label={`Archive ${g.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      id={`goal-restore-${g.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreGoal(g.id)}
                      aria-label={`Restore ${g.name}`}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {goals.length === 0 && (
                <div id="goal-manager-empty" className="text-center text-gray-400 py-12">
                  <p className="text-sm">No goals yet. Create one above to start tracking.</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
