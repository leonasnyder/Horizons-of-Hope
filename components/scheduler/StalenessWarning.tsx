'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { computeStreak, getWeekStart } from '@/lib/utils';

interface ActivityWithStreak {
  id: number;
  name: string;
  category: string | null;
  streak: number;
}

interface StalenessWarningProps {
  amberThreshold?: number;
  redThreshold?: number;
}

export default function StalenessWarning({
  amberThreshold = 4,
  redThreshold = 6,
}: StalenessWarningProps) {
  const [staleActivities, setStaleActivities] = useState<ActivityWithStreak[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithStreak | null>(null);
  const [replacements, setReplacements] = useState<Array<{ id: number; name: string; category: string | null }>>([]);

  useEffect(() => {
    const currentWeek = getWeekStart(new Date());

    async function computeStaleness() {
      try {
        // Fetch all activities and the full export (for usage log) in parallel
        const [activitiesRes, exportRes] = await Promise.all([
          fetch('/api/activities'),
          fetch('/api/export'),
        ]);

        if (!activitiesRes.ok || !exportRes.ok) return;

        const activities: Array<{ id: number; name: string; category: string | null; is_archived: number }> = await activitiesRes.json();
        const exportData = await exportRes.json();

        const usageLog: Array<{ activity_id: number; week_start: string }> =
          Array.isArray(exportData.activity_usage_log) ? exportData.activity_usage_log : [];

        const stale: ActivityWithStreak[] = [];

        for (const act of activities.filter(a => !a.is_archived)) {
          const activityUsage = usageLog
            .filter(u => u.activity_id === act.id)
            .map(u => u.week_start)
            .sort()
            .reverse();

          const streak = computeStreak(activityUsage, currentWeek);
          if (streak >= amberThreshold) {
            stale.push({ id: act.id, name: act.name, category: act.category, streak });
          }
        }

        setStaleActivities(stale);
      } catch {
        // Non-critical — fail silently
      }
    }

    computeStaleness();
  }, [amberThreshold]);

  const suggestReplacements = async (act: ActivityWithStreak) => {
    setSelectedActivity(act);
    const res = await fetch('/api/activities?includeArchived=true');
    const all = await res.json();
    setReplacements(
      all.filter((a: { id: number; category: string | null; is_archived: number }) =>
        a.category === act.category && a.is_archived === 1
      )
    );
  };

  const restoreReplacement = async (replacement: { id: number; name: string }) => {
    await fetch(`/api/activities/${replacement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: 0, is_default: 1 }),
    });
    setSelectedActivity(null);
  };

  if (staleActivities.length === 0) return null;

  return (
    <div id="staleness-warning" className="space-y-2 mb-4">
      {staleActivities.map(act => {
        const isRed = act.streak >= redThreshold;
        return (
          <div
            key={act.id}
            id={`staleness-warning-${act.id}`}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              isRed
                ? 'border-red-300 bg-red-50 dark:bg-red-950/30'
                : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'
            }`}
          >
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${isRed ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{act.name}</p>
              <p className="text-xs text-gray-500">
                {isRed
                  ? `Used ${act.streak} weeks in a row — strongly recommend a new activity`
                  : `Used ${act.streak} weeks in a row — consider rotating`}
              </p>
            </div>
            <Button
              id={`staleness-suggest-${act.id}`}
              variant="outline"
              size="sm"
              onClick={() => suggestReplacements(act)}
              className="flex-shrink-0"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Suggest Replacement
            </Button>
          </div>
        );
      })}

      {selectedActivity && (
        <Dialog open onOpenChange={() => setSelectedActivity(null)}>
          <DialogContent id="staleness-replacement-modal">
            <DialogHeader>
              <DialogTitle>Replacement Activities for &quot;{selectedActivity.name}&quot;</DialogTitle>
            </DialogHeader>
            {replacements.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                No archived activities in the same category ({selectedActivity.category ?? 'uncategorized'}) found.
                Consider creating a new activity or using one from a different category.
              </p>
            ) : (
              <div className="space-y-2">
                {replacements.map(r => (
                  <div
                    key={r.id}
                    id={`replacement-${r.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <span className="text-sm font-medium">{r.name}</span>
                    <Button
                      id={`replacement-restore-${r.id}`}
                      size="sm"
                      onClick={() => restoreReplacement(r)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Restore &amp; Use
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
