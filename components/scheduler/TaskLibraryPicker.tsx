'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface LibraryItem {
  id: number;
  label: string;
  sort_order: number;
}

interface LibraryCategory {
  id: number;
  name: string;
  sort_order: number;
  items: LibraryItem[];
}

interface TaskLibraryPickerProps {
  selectedLabels: string[];
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
  onClose: () => void;
}

export default function TaskLibraryPicker({
  selectedLabels,
  onAdd,
  onRemove,
  onClose,
}: TaskLibraryPickerProps) {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/task-library')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
          // Auto-open first category
          if (data.length > 0) setOpenCategories(new Set([data[0].id]));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedSet = new Set(selectedLabels.map(l => l.toLowerCase()));

  const toggleCategory = (id: number) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleItem = (label: string) => {
    if (selectedSet.has(label.toLowerCase())) {
      onRemove(label);
    } else {
      onAdd(label);
    }
  };

  const q = search.toLowerCase().trim();

  const filteredCategories = categories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => !q || item.label.toLowerCase().includes(q)),
    }))
    .filter(cat => !q || cat.items.length > 0);

  // Auto-expand all categories when searching
  useEffect(() => {
    if (q) {
      setOpenCategories(new Set(categories.map(c => c.id)));
    }
  }, [q, categories]);

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Task Library
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close library"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Categories & Items */}
      <div className="overflow-y-auto max-h-64">
        {loading && (
          <p className="text-xs text-gray-400 text-center py-6">Loading library...</p>
        )}
        {!loading && filteredCategories.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">
            {q ? 'No tasks match your search' : 'Library is empty'}
          </p>
        )}
        {filteredCategories.map(cat => {
          const isOpen = openCategories.has(cat.id);
          return (
            <div key={cat.id}>
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800"
              >
                {isOpen
                  ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                }
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {cat.name}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {cat.items.filter(i => selectedSet.has(i.label.toLowerCase())).length > 0
                    ? `${cat.items.filter(i => selectedSet.has(i.label.toLowerCase())).length} selected`
                    : ''}
                </span>
              </button>
              {isOpen && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                  {cat.items.map(item => {
                    const isSelected = selectedSet.has(item.label.toLowerCase());
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleItem(item.label)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-red-400 hover:text-red-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
