'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Category { id: number; name: string; color: string; sort_order: number; }

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export default function CategoryManager({ open, onClose, onChanged }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6B7280');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const fetchCategories = () => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
  };

  useEffect(() => { if (open) fetchCategories(); }, [open]);

  const addCategory = async () => {
    if (!newName.trim()) { toast.error('Name is required'); return; }
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewName('');
      fetchCategories();
      onChanged();
      toast.success('Category added');
    } catch (e) { toast.error(String(e)); }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return; }
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditingId(null);
      fetchCategories();
      onChanged();
      toast.success('Category updated');
    } catch (e) { toast.error(String(e)); }
  };

  const deleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? Activities in this category will become uncategorized.`)) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      fetchCategories();
      onChanged();
      toast.success('Category deleted');
    } catch (e) { toast.error(String(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent id="category-manager" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <div id="category-list" className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {categories.map(cat => (
            <div key={cat.id} id={`category-item-${cat.id}`}
              className="flex items-center gap-2 p-2 rounded-lg border bg-white dark:bg-gray-800">
              {editingId === cat.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="h-9 w-10 rounded border cursor-pointer flex-shrink-0"
                    aria-label="Category color"
                  />
                  <Input
                    id={`category-edit-name-${cat.id}`}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(cat.id)}
                    className="flex-1 h-9"
                  />
                  <Button size="sm" onClick={() => saveEdit(cat.id)} id={`category-save-${cat.id}`}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  <Button
                    id={`category-edit-${cat.id}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(cat)}
                    aria-label={`Edit ${cat.name}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    id={`category-delete-${cat.id}`}
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-600"
                    onClick={() => deleteCategory(cat.id, cat.name)}
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No categories yet</p>
          )}
        </div>

        <div id="category-add-form" className="flex items-center gap-2 pt-3 border-t">
          <input
            type="color"
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            className="h-11 w-12 rounded-lg border cursor-pointer flex-shrink-0"
            aria-label="New category color"
          />
          <Input
            id="new-category-name"
            placeholder="New category name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            className="flex-1"
          />
          <Button onClick={addCategory} id="add-category-btn">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
