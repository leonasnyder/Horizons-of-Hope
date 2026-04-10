'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';

interface LibraryItem { id: number; label: string; sort_order: number; }
interface LibraryCategory { id: number; name: string; sort_order: number; items: LibraryItem[]; }

interface TaskLibraryManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function TaskLibraryManager({ open, onClose }: TaskLibraryManagerProps) {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Inline edit state
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState('');

  // New entry state
  const [newCatName, setNewCatName] = useState('');
  const [addingItemToCat, setAddingItemToCat] = useState<number | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/task-library').then(r => r.json());
      if (Array.isArray(data)) {
        setCategories(data);
        // Auto-expand all on first load
        setExpanded(new Set(data.map((c: LibraryCategory) => c.id)));
      }
    } catch { toast.error('Failed to load library'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) fetchLibrary(); }, [open]);

  // Category actions
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch('/api/task-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewCatName('');
      await fetchLibrary();
      toast.success('Category added');
    } catch { toast.error('Failed to add category'); }
  };

  const renameCategory = async (id: number) => {
    if (!editingCatName.trim()) return;
    try {
      await fetch(`/api/task-library/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCatName.trim() }),
      });
      setEditingCatId(null);
      await fetchLibrary();
    } catch { toast.error('Failed to rename category'); }
  };

  const deleteCategory = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}" and all its tasks?`)) return;
    try {
      await fetch(`/api/task-library/categories/${id}`, { method: 'DELETE' });
      await fetchLibrary();
      toast.success('Category deleted');
    } catch { toast.error('Failed to delete category'); }
  };

  // Item actions
  const addItem = async (categoryId: number) => {
    if (!newItemLabel.trim()) return;
    try {
      const res = await fetch('/api/task-library/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId, label: newItemLabel.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewItemLabel('');
      setAddingItemToCat(null);
      await fetchLibrary();
    } catch { toast.error('Failed to add task'); }
  };

  const renameItem = async (id: number) => {
    if (!editingItemLabel.trim()) return;
    try {
      await fetch(`/api/task-library/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editingItemLabel.trim() }),
      });
      setEditingItemId(null);
      await fetchLibrary();
    } catch { toast.error('Failed to rename task'); }
  };

  const deleteItem = async (id: number, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    try {
      await fetch(`/api/task-library/items/${id}`, { method: 'DELETE' });
      await fetchLibrary();
    } catch { toast.error('Failed to delete task'); }
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Task Library</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No categories yet. Add one below.</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="border rounded-lg overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
                  <button onClick={() => toggleExpand(cat.id)} className="text-gray-400 hover:text-gray-600">
                    {expanded.has(cat.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingCatName}
                        onChange={e => setEditingCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renameCategory(cat.id); if (e.key === 'Escape') setEditingCatId(null); }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <button onClick={() => renameCategory(cat.id)} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditingCatId(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <span className="flex-1 text-sm font-semibold">{cat.name}
                      <span className="text-xs font-normal text-gray-400 ml-2">{cat.items.length} tasks</span>
                    </span>
                  )}

                  {editingCatId !== cat.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                        className="p-1 text-gray-400 hover:text-blue-500"
                        aria-label="Rename category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id, cat.name)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Items */}
                {expanded.has(cat.id) && (
                  <div className="divide-y dark:divide-gray-700">
                    {cat.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 px-4 py-1.5">
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingItemLabel}
                              onChange={e => setEditingItemLabel(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') renameItem(item.id); if (e.key === 'Escape') setEditingItemId(null); }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <button onClick={() => renameItem(item.id)} className="text-green-600"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditingItemId(null)} className="text-gray-400"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{item.label}</span>
                            <button
                              onClick={() => { setEditingItemId(item.id); setEditingItemLabel(item.label); }}
                              className="p-1 text-gray-300 hover:text-blue-500"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id, item.label)}
                              className="p-1 text-gray-300 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add item row */}
                    {addingItemToCat === cat.id ? (
                      <div className="flex items-center gap-2 px-4 py-2">
                        <Input
                          value={newItemLabel}
                          onChange={e => setNewItemLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addItem(cat.id); if (e.key === 'Escape') { setAddingItemToCat(null); setNewItemLabel(''); } }}
                          placeholder="New task name..."
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <button onClick={() => addItem(cat.id)} className="text-green-600"><Check className="h-4 w-4" /></button>
                        <button onClick={() => { setAddingItemToCat(null); setNewItemLabel(''); }} className="text-gray-400"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingItemToCat(cat.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add task
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add category */}
        <div className="border-t pt-3 flex gap-2">
          <Input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="New category name..."
            className="text-sm"
          />
          <Button size="sm" onClick={addCategory} disabled={!newCatName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
