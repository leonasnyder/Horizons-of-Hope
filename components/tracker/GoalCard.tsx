'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { accuracy } from '@/lib/utils';
import ResponseButtons from './ResponseButtons';
import ResponseLog from './ResponseLog';
import EditResponseModal from './EditResponseModal';
import { toast } from 'sonner';

interface Subcategory {
  id: number;
  label: string;
  response_type: 'correct' | 'incorrect';
}

interface Response {
  id: number;
  goal_id: number;
  response_type: 'correct' | 'incorrect';
  subcategory_id: number | null;
  subcategory_label: string | null;
  timestamp: string;
  session_notes: string | null;
}

interface Goal {
  id: number;
  name: string;
  description: string | null;
  color: string;
  subcategories: Subcategory[];
}

interface GoalCardProps {
  goal: Goal;
  date: string;
  responses: Response[];
  onResponseAdded: () => void;
}

export default function GoalCard({ goal, date, responses, onResponseAdded }: GoalCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [sessionNote, setSessionNote] = useState('');
  const [editingResponse, setEditingResponse] = useState<Response | null>(null);

  const correct = responses.filter(r => r.response_type === 'correct').length;
  const incorrect = responses.filter(r => r.response_type === 'incorrect').length;
  const total = correct + incorrect;
  const acc = accuracy(correct, total);

  const correctSubcats = goal.subcategories.filter(s => s.response_type === 'correct');
  const incorrectSubcats = goal.subcategories.filter(s => s.response_type === 'incorrect');

  const handleLog = async (response_type: 'correct' | 'incorrect', subcategory_id: number) => {
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goal.id,
          subcategory_id,
          response_type,
          date,
          session_notes: sessionNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      onResponseAdded();
      toast.success(
        response_type === 'correct' ? '✓ Correct response logged' : '✗ Incorrect response logged'
      );
      setSessionNote('');
    } catch {
      toast.error('Failed to log response');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/responses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onResponseAdded();
      toast.success('Response removed');
    } catch {
      toast.error('Failed to delete response');
    }
  };

  const handleEdit = async (id: number, data: {
    response_type: 'correct' | 'incorrect';
    subcategory_id: number | null;
    session_notes: string | null;
  }) => {
    const res = await fetch(`/api/responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    onResponseAdded();
    toast.success('Response updated');
  };

  const chartData = [
    { name: 'Correct', value: correct, fill: '#22C55E' },
    { name: 'Incorrect', value: incorrect, fill: '#EF4444' },
  ];

  return (
    <div id={`goal-card-${goal.id}`} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <button
        id={`goal-card-header-${goal.id}`}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: goal.color }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{goal.name}</h3>
          {goal.description && (
            <p className="text-xs text-gray-500 truncate">{goal.description}</p>
          )}
        </div>
        <div id={`goal-card-tally-${goal.id}`} className="flex items-center gap-3 text-sm flex-shrink-0">
          <span className="text-green-600 font-semibold">✓ {correct}</span>
          <span className="text-red-500 font-semibold">✗ {incorrect}</span>
          {total > 0 && (
            <span className={`font-bold ${
              acc >= 80 ? 'text-green-600' : acc >= 50 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {acc}%
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div id={`goal-card-body-${goal.id}`} className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700">
          {/* Response buttons */}
          <div className="pt-4">
            <ResponseButtons
              goalId={goal.id}
              correctSubcats={correctSubcats}
              incorrectSubcats={incorrectSubcats}
              onLog={handleLog}
            />
          </div>

          {/* Mini bar chart */}
          {total > 0 && (
            <div id={`goal-card-chart-${goal.id}`} className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [value, 'Responses']}
                    contentStyle={{ fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Response log */}
          <div id={`goal-card-log-section-${goal.id}`}>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Today's Response Log ({total})
            </p>
            <ResponseLog
              responses={responses}
              onDelete={handleDelete}
              onEdit={r => setEditingResponse(r as Response)}
            />
          </div>

          {/* Session note */}
          <div id={`goal-card-note-${goal.id}`} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Session Notes</span>
              {sessionNote.trim() && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">— attached to next response</span>
              )}
            </div>
            <textarea
              id={`goal-session-note-${goal.id}`}
              placeholder="Write notes about this session... (will be attached to the next response logged)"
              value={sessionNote}
              onChange={e => setSessionNote(e.target.value)}
              rows={3}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring dark:bg-gray-700 dark:border-gray-600 resize-none"
            />
          </div>
        </div>
      )}
      {editingResponse && (
        <EditResponseModal
          response={editingResponse}
          goalSubcategories={goal.subcategories}
          onClose={() => setEditingResponse(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
