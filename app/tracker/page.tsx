'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import DatePicker from '@/components/shared/DatePicker';
import GoalCard from '@/components/tracker/GoalCard';
import GoalManager from '@/components/tracker/GoalManager';
import AnalyticsDashboard from '@/components/tracker/AnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { Settings2, BarChart2, ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Subcategory {
  id: number;
  label: string;
  response_type: 'correct' | 'incorrect';
}

interface Goal {
  id: number;
  name: string;
  description: string | null;
  color: string;
  is_active: number;
  subcategories: Subcategory[];
}

interface Response {
  id: number;
  goal_id: number;
  response_type: 'correct' | 'incorrect';
  subcategory_label: string | null;
  timestamp: string;
  session_notes: string | null;
}

type TabMode = 'entry' | 'analytics';

export default function TrackerPage() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [goals, setGoals] = useState<Goal[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [goalManagerOpen, setGoalManagerOpen] = useState(false);
  const [tab, setTab] = useState<TabMode>('entry');

  const fetchGoals = useCallback(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then((data: Goal[]) => {
        if (Array.isArray(data)) {
          setGoals(data.filter(g => g.is_active));
        }
      })
      .catch(() => toast.error('Failed to load goals'))
      .finally(() => setLoadingGoals(false));
  }, []);

  const fetchResponses = useCallback(() => {
    fetch(`/api/responses?date=${date}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setResponses(data); })
      .catch(() => {});
  }, [date]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);
  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const responsesForGoal = (goalId: number) =>
    responses.filter(r => r.goal_id === goalId);

  return (
    <div id="tracker-page" className="max-w-4xl mx-auto p-4">
      <div id="tracker-header" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <DatePicker date={date} onChange={setDate} />

        <div className="flex items-center gap-2 flex-wrap">
          <div id="tracker-tab-toggle" className="flex rounded-lg border overflow-hidden">
            <button
              id="tracker-entry-btn"
              onClick={() => setTab('entry')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium min-h-[44px] transition-colors ${
                tab === 'entry'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <ClipboardList className="h-4 w-4" /> Data Entry
            </button>
            <button
              id="tracker-analytics-btn"
              onClick={() => setTab('analytics')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium min-h-[44px] transition-colors ${
                tab === 'analytics'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <BarChart2 className="h-4 w-4" /> Analytics
            </button>
          </div>

          <Button
            id="tracker-manage-goals"
            variant="outline"
            size="sm"
            onClick={() => setGoalManagerOpen(true)}
          >
            <Settings2 className="h-4 w-4 mr-1" /> Goals
          </Button>
        </div>
      </div>

      {loadingGoals ? (
        <div id="tracker-loading" className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : tab === 'entry' ? (
        <div id="tracker-entry" className="space-y-4">
          {goals.length === 0 ? (
            <div id="tracker-empty" className="text-center py-16 text-gray-400">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No active goals</p>
              <p className="text-sm mt-1">Click "Goals" above to create your first goal</p>
            </div>
          ) : (
            goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                date={date}
                responses={responsesForGoal(goal.id)}
                onResponseAdded={fetchResponses}
              />
            ))
          )}
        </div>
      ) : (
        <AnalyticsDashboard date={date} goals={goals} />
      )}

      <GoalManager
        open={goalManagerOpen}
        onClose={() => setGoalManagerOpen(false)}
        onChanged={fetchGoals}
      />
    </div>
  );
}
