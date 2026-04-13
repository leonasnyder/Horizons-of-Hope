'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Loader2, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PATask {
  id: number;
  title: string;
  notes: string | null;
  is_completed: number;
  completed_at: string | null;
  created_at: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<PATask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  // Swipe-to-delete state per task
  const [swipeX, setSwipeX] = useState<Record<number, number>>({});
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiping = useRef(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (editingId !== null) setTimeout(() => editRef.current?.focus(), 50);
  }, [editingId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error();
      const task = await res.json();
      setTasks(prev => [task, ...prev]);
      setNewTitle('');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (task: PATask) => {
    const newVal = task.is_completed ? 0 : 1;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: newVal } : t));
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: newVal }),
      });
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: task.is_completed } : t));
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } catch {
      toast.error('Failed to delete task');
      fetchTasks();
    }
  };

  const handleEditSave = async (task: PATask) => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === task.title) {
      setEditingId(null);
      return;
    }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: trimmed } : t));
    setEditingId(null);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
    } catch {
      toast.error('Failed to update task');
      fetchTasks();
    }
  };

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent, id: number) => {
    swipeStart.current = { id, x: e.touches[0].clientX, y: e.touches[0].clientY };
    swiping.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const dx = e.touches[0].clientX - swipeStart.current.x;
    const dy = e.touches[0].clientY - swipeStart.current.y;
    if (!swiping.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) >= Math.abs(dx) || dx >= 0) { swipeStart.current = null; return; }
      swiping.current = true;
    }
    const id = swipeStart.current.id;
    const val = Math.max(dx, -80);
    setSwipeX(prev => ({ ...prev, [id]: val }));
  };
  const onTouchEnd = () => {
    if (!swipeStart.current) return;
    const id = swipeStart.current.id;
    const val = swipeX[id] ?? 0;
    if (val < -60) {
      handleDelete(id);
    } else {
      setSwipeX(prev => ({ ...prev, [id]: 0 }));
    }
    swipeStart.current = null;
    swiping.current = false;
  };

  const pending = tasks.filter(t => !t.is_completed);
  const completed = tasks.filter(t => t.is_completed);

  const TaskRow = ({ task }: { task: PATask }) => (
    <div className="relative overflow-hidden">
      {/* Red delete strip */}
      {(swipeX[task.id] ?? 0) < 0 && (
        <div className="absolute inset-0 flex items-center justify-end bg-red-500 pr-4 pointer-events-none">
          <Trash2 className="h-5 w-5 text-white" />
        </div>
      )}
      {/* Sliding row */}
      <div
        style={{
          transform: `translateX(${swipeX[task.id] ?? 0}px)`,
          transition: (swipeX[task.id] ?? 0) === 0 ? 'transform 0.2s ease' : 'none',
        }}
        onTouchStart={e => onTouchStart(e, task.id)}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900"
      >
        {/* Circle toggle */}
        <button
          type="button"
          onClick={() => handleToggle(task)}
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
          className="flex-shrink-0 transition-colors"
          aria-label={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.is_completed
            ? <CheckCircle2 className="h-6 w-6 text-red-500" />
            : <Circle className="h-6 w-6 text-gray-300 hover:text-red-400" />
          }
        </button>

        {/* Title — tap to edit */}
        <div className="flex-1 min-w-0">
          {editingId === task.id ? (
            <input
              ref={editRef}
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={() => handleEditSave(task)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleEditSave(task);
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="w-full text-sm bg-transparent border-b border-red-400 outline-none py-0.5"
            />
          ) : (
            <span
              onClick={() => { setEditingId(task.id); setEditTitle(task.title); }}
              className={cn(
                'text-sm cursor-text block truncate',
                task.is_completed
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-800 dark:text-gray-200'
              )}
            >
              {task.title}
            </span>
          )}
        </div>

        {/* Delete button (desktop) */}
        <button
          type="button"
          onClick={() => handleDelete(task.id)}
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
          className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colors hidden sm:block"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {/* Divider */}
      <div className="h-px bg-gray-100 dark:bg-gray-800 ml-[52px]" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">PA Tasks</h1>

      {/* Add task input */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-4 py-3 mb-6">
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newTitle.trim()}
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
          className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
          aria-label="Add task"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Plus className="h-3.5 w-3.5 text-white" />}
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder="New task..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending tasks */}
          {pending.length === 0 && completed.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Circle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tasks yet. Add one above!</p>
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {pending.map(task => <TaskRow key={task.id} task={task} />)}
                </div>
              )}

              {/* Completed section */}
              {completed.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCompleted(v => !v)}
                    style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {showCompleted
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                    }
                    Completed ({completed.length})
                  </button>
                  {showCompleted && completed.map(task => <TaskRow key={task.id} task={task} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
