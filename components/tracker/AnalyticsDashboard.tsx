'use client';
import { useState, useEffect, useRef } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { Printer, Download, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TrendChart from './TrendChart';
import SubcategoryBreakdown from './SubcategoryBreakdown';
import { accuracy } from '@/lib/utils';

interface SubcatBreakdownItem {
  subcategory_id: number | null;
  label: string | null;
  response_type: 'correct' | 'incorrect';
  count: number;
  goal_id: number;
}

interface GoalSummaryItem {
  goal_id: number;
  name: string;
  color: string;
  total: number;
  correct: number;
}

interface AnalyticsData {
  date: string;
  todaySummary: { total: number; correct: number; incorrect: number };
  goalSummary: GoalSummaryItem[];
  trend: Array<{ date: string; accuracy: number; total: number; correct: number }>;
  subcatBreakdown: SubcatBreakdownItem[];
  weekCompare: { this_correct: number; this_total: number; last_correct: number; last_total: number } | null;
}

interface AnalyticsDashboardProps {
  date: string;
  goals: Array<{ id: number; name: string; color: string }>;
}

export default function AnalyticsDashboard({ date, goals }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const goalParam = selectedGoalId ? `&goalId=${selectedGoalId}` : '';
    fetch(`/api/analytics?date=${date}&days=${days}${goalParam}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, days, selectedGoalId]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Analytics-${date}`,
  });

  const handleExportCSV = async () => {
    try {
      const startDate = format(subDays(parseISO(date), 29), 'yyyy-MM-dd');
      const res = await fetch(`/api/responses?startDate=${startDate}&endDate=${date}`);
      const responses = await res.json();
      if (!Array.isArray(responses)) throw new Error();

      const headers = 'date,goal_name,response_type,subcategory,timestamp\n';
      const rows = responses.map((r: {
        date: string; goal_name: string; response_type: string;
        subcategory_label: string | null; timestamp: string;
      }) =>
        `${r.date},"${(r.goal_name ?? '').replace(/"/g, '""')}",${r.response_type},"${(r.subcategory_label ?? '').replace(/"/g, '""')}",${r.timestamp}`
      ).join('\n');

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `horizons-data-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div id="analytics-loading" className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div id="analytics-error" className="text-center py-16 text-gray-400">
        <p>Failed to load analytics data</p>
      </div>
    );
  }

  const todayAcc = accuracy(data.todaySummary.correct, data.todaySummary.total);
  const thisAcc = accuracy(
    data.weekCompare?.this_correct ?? 0,
    data.weekCompare?.this_total ?? 0
  );
  const lastAcc = accuracy(
    data.weekCompare?.last_correct ?? 0,
    data.weekCompare?.last_total ?? 0
  );
  const weekDiff = thisAcc - lastAcc;

  const bestGoal = data.goalSummary.reduce<GoalSummaryItem | null>((best, g) => {
    if (!best) return g;
    return accuracy(g.correct, g.total) > accuracy(best.correct, best.total) ? g : best;
  }, null);

  const worstSubcat = data.subcatBreakdown
    .filter(s => s.response_type === 'incorrect')
    .sort((a, b) => b.count - a.count)[0];

  return (
    <div id="analytics-dashboard" ref={printRef}>
      {/* Toolbar */}
      <div id="analytics-toolbar" className="flex items-center justify-between mb-6 flex-wrap gap-2 no-print">
        <h2 className="text-xl font-bold">Analytics Dashboard</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            id="analytics-days-select"
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <select
            id="analytics-goal-select"
            value={selectedGoalId ?? ''}
            onChange={e => setSelectedGoalId(e.target.value ? Number(e.target.value) : null)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All goals</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <Button id="analytics-csv" variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button id="analytics-print" variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div id="analytics-summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card id="analytics-card-total">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Responses Today</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">{data.todaySummary.total}</p>
          </CardContent>
        </Card>
        <Card id="analytics-card-accuracy">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-gray-500 font-medium uppercase tracking-wide">Today's Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-3xl font-bold ${
              todayAcc >= 80 ? 'text-green-600' : todayAcc >= 50 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {data.todaySummary.total > 0 ? `${todayAcc}%` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card id="analytics-card-best-goal">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-gray-500 font-medium uppercase tracking-wide">Best Goal Today</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm font-semibold truncate">{bestGoal?.name ?? '—'}</p>
            {bestGoal && (
              <p className="text-xs text-gray-400">
                {accuracy(bestGoal.correct, bestGoal.total)}% accuracy
              </p>
            )}
          </CardContent>
        </Card>
        <Card id="analytics-card-worst-subcat">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-gray-500 font-medium uppercase tracking-wide">Most Common Incorrect</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm font-semibold truncate">{worstSubcat?.label ?? '—'}</p>
            {worstSubcat && (
              <p className="text-xs text-gray-400">{worstSubcat.count}× this period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overall Trend */}
      <Card id="analytics-trend" className="mb-4">
        <CardHeader><CardTitle className="text-base">Accuracy Trend ({days} days)</CardTitle></CardHeader>
        <CardContent>
          <TrendChart data={data.trend} goalColor={selectedGoalId ? (goals.find(g => g.id === selectedGoalId)?.color ?? '#F97316') : '#F97316'} />
        </CardContent>
      </Card>

      {/* Per-goal analysis */}
      {data.goalSummary.map(g => (
        <Card key={g.goal_id} id={`analytics-goal-${g.goal_id}`} className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate">{g.name}</span>
              <span className={`text-sm font-bold ml-auto ${
                accuracy(g.correct, g.total) >= 80 ? 'text-green-600' : 'text-amber-500'
              }`}>
                {accuracy(g.correct, g.total)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-green-600 mb-1">Correct Subcategories</p>
                <SubcategoryBreakdown
                  data={data.subcatBreakdown.filter(s => s.goal_id === g.goal_id)}
                  type="correct"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-500 mb-1">Incorrect Subcategories</p>
                <SubcategoryBreakdown
                  data={data.subcatBreakdown.filter(s => s.goal_id === g.goal_id)}
                  type="incorrect"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {data.goalSummary.length === 0 && (
        <div id="analytics-no-data" className="text-center py-12 text-gray-400">
          <p className="text-sm">No response data for this period. Start logging responses in Data Entry mode.</p>
        </div>
      )}

      {/* Week comparison */}
      <Card id="analytics-week-compare">
        <CardHeader><CardTitle className="text-base">Week over Week</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">This Week</p>
              <p className="text-2xl font-bold">{data.weekCompare?.this_total ? `${thisAcc}%` : '—'}</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold">
              {data.weekCompare?.this_total && data.weekCompare?.last_total ? (
                weekDiff > 0 ? (
                  <><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-green-600">+{weekDiff}%</span></>
                ) : weekDiff < 0 ? (
                  <><TrendingDown className="h-4 w-4 text-red-500" /><span className="text-red-500">{weekDiff}%</span></>
                ) : (
                  <><Minus className="h-4 w-4 text-gray-400" /><span className="text-gray-400">No change</span></>
                )
              ) : (
                <span className="text-gray-400 text-xs">No comparison data</span>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Last Week</p>
              <p className="text-2xl font-bold text-gray-400">{data.weekCompare?.last_total ? `${lastAcc}%` : '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
