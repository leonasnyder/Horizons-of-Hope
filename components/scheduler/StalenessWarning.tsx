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

    fetch('/api/activities')
      .then(r => r.json())
      .then(async (activities: Array<{ id: number; name: string; category: string | null; is_archived: number }>) => {
        const stale: ActivityWithStreak[] = [];

        for (const act of activities.filter(a => !a.is_archived)) {
          // Fetch usage log for this activity via analytics endpoint
          const res = await fetch(`/api/activities/${act.id}`);
          if (!res.ok) continue;
          // We need activity_usage_log rows — fetch them via a dedicated query
          // Since we don't have a separate endpoint, use the export to get usage log
          // Instead, call the schedule endpoint to approximate — but best approach:
          // Add ?usage=true to the activities/[id] endpoint or use analytics
          // For now, use a workaround: fetch from usage log via export
          const exportRes = await fetch('/api/export');
          const exportData = await exportRes.json();
          const usageLog = (exportData.activity_usage_log as Array<{ activity_id: number; week_start: string }>)
            .filter(u => u.activity_id === act.id)
            .map(u => u.week_start)
            .sort()
            .reverse();

          const streak = computeStreak(usageLog, currentWeek);
          if (streak >= amberThreshold) {
            stale.push({ ...act, streak });
          }
        }

        setStaleActivities(stale);
      })
      .catch(() => {});
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
