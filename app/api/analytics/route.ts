import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { format, subDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');
    const days = Number(searchParams.get('days') ?? 7);
    const goalId = searchParams.get('goalId');

    const startDate = format(subDays(parseISO(date), days - 1), 'yyyy-MM-dd');

    // Daily accuracy trend
    const trendArgs: (string | number)[] = [startDate, date];
    if (goalId) trendArgs.push(Number(goalId));
    const trend = db.prepare(`
      SELECT date,
        COUNT(*) as total,
        SUM(CASE WHEN response_type='correct' THEN 1 ELSE 0 END) as correct
      FROM goal_responses
      WHERE date >= ? AND date <= ?
      ${goalId ? 'AND goal_id = ?' : ''}
      GROUP BY date
      ORDER BY date
    `).all(...trendArgs) as Array<{ date: string; total: number; correct: number }>;

    // Today summary
    const todaySummary = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN response_type='correct' THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN response_type='incorrect' THEN 1 ELSE 0 END) as incorrect
      FROM goal_responses WHERE date = ?
    `).get(date) as { total: number; correct: number; incorrect: number };

    // Per-goal summary for today
    const goalSummary = db.prepare(`
      SELECT gr.goal_id, g.name, g.color,
        COUNT(*) as total,
        SUM(CASE WHEN gr.response_type='correct' THEN 1 ELSE 0 END) as correct
      FROM goal_responses gr
      JOIN goals g ON gr.goal_id = g.id
      WHERE gr.date = ?
      GROUP BY gr.goal_id
    `).all(date);

    // Subcategory breakdown for the period
    const subcatArgs: (string | number)[] = [startDate, date];
    if (goalId) subcatArgs.push(Number(goalId));
    const subcatBreakdown = db.prepare(`
      SELECT gr.subcategory_id, gs.label, gr.response_type, COUNT(*) as count, gr.goal_id
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      WHERE gr.date >= ? AND gr.date <= ?
      ${goalId ? 'AND gr.goal_id = ?' : ''}
      GROUP BY gr.subcategory_id, gr.response_type
      ORDER BY count DESC
    `).all(...subcatArgs);

    // Week comparison
    const thisWeekStart = format(subDays(parseISO(date), 6), 'yyyy-MM-dd');
    const lastWeekStart = format(subDays(parseISO(thisWeekStart), 7), 'yyyy-MM-dd');

    const weekCompare = db.prepare(`
      SELECT
        SUM(CASE WHEN date >= ? THEN (CASE WHEN response_type='correct' THEN 1 ELSE 0 END) ELSE 0 END) as this_correct,
        SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as this_total,
        SUM(CASE WHEN date < ? THEN (CASE WHEN response_type='correct' THEN 1 ELSE 0 END) ELSE 0 END) as last_correct,
        SUM(CASE WHEN date < ? THEN 1 ELSE 0 END) as last_total
      FROM goal_responses
      WHERE date >= ? AND date <= ?
    `).get(thisWeekStart, thisWeekStart, thisWeekStart, thisWeekStart, lastWeekStart, date);

    return NextResponse.json({
      date,
      todaySummary,
      goalSummary,
      trend: (trend).map(t => ({
        ...t,
        accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
      })),
      subcatBreakdown,
      weekCompare,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
