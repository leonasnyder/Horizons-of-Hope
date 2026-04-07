import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { format, subDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');
    const days = Number(searchParams.get('days') ?? 7);
    const goalId = searchParams.get('goalId');

    const startDate = format(subDays(parseISO(date), days - 1), 'yyyy-MM-dd');
    const goalFilter = goalId ? sql`AND goal_id = ${Number(goalId)}` : sql``;
    const subcatGoalFilter = goalId ? sql`AND gr.goal_id = ${Number(goalId)}` : sql``;

    const trend = await sql`
      SELECT date,
        COUNT(*) as total,
        SUM(CASE WHEN response_type='correct' THEN 1 ELSE 0 END) as correct
      FROM goal_responses
      WHERE date >= ${startDate} AND date <= ${date}
      ${goalFilter}
      GROUP BY date
      ORDER BY date
    `;

    const [todaySummary] = await sql`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN response_type='correct' THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN response_type='incorrect' THEN 1 ELSE 0 END) as incorrect
      FROM goal_responses WHERE date = ${date}
    `;

    const goalSummary = await sql`
      SELECT gr.goal_id, g.name, g.color,
        COUNT(*) as total,
        SUM(CASE WHEN gr.response_type='correct' THEN 1 ELSE 0 END) as correct
      FROM goal_responses gr
      JOIN goals g ON gr.goal_id = g.id
      WHERE gr.date = ${date}
      GROUP BY gr.goal_id, g.name, g.color
      ORDER BY g.name
    `;

    const subcatBreakdown = await sql`
      SELECT gr.subcategory_id, gs.label, gr.response_type, COUNT(*) as count, gr.goal_id
      FROM goal_responses gr
      LEFT JOIN goal_subcategories gs ON gr.subcategory_id = gs.id
      WHERE gr.date >= ${startDate} AND gr.date <= ${date}
      ${subcatGoalFilter}
      GROUP BY gr.subcategory_id, gs.label, gr.response_type, gr.goal_id
      ORDER BY gs.label, count DESC
    `;

    const thisWeekStart = format(subDays(parseISO(date), 6), 'yyyy-MM-dd');
    const lastWeekStart = format(subDays(parseISO(thisWeekStart), 7), 'yyyy-MM-dd');

    const [weekCompare] = await sql`
      SELECT
        SUM(CASE WHEN date >= ${thisWeekStart} THEN (CASE WHEN response_type='correct' THEN 1 ELSE 0 END) ELSE 0 END) as this_correct,
        SUM(CASE WHEN date >= ${thisWeekStart} THEN 1 ELSE 0 END) as this_total,
        SUM(CASE WHEN date < ${thisWeekStart} THEN (CASE WHEN response_type='correct' THEN 1 ELSE 0 END) ELSE 0 END) as last_correct,
        SUM(CASE WHEN date < ${thisWeekStart} THEN 1 ELSE 0 END) as last_total
      FROM goal_responses
      WHERE date >= ${lastWeekStart} AND date <= ${date}
    `;

    return NextResponse.json({
      date,
      todaySummary,
      goalSummary,
      trend: (trend as unknown as Array<{ date: string; total: string; correct: string }>).map(t => ({
        ...t,
        total: Number(t.total),
        correct: Number(t.correct),
        accuracy: Number(t.total) > 0 ? Math.round((Number(t.correct) / Number(t.total)) * 100) : 0,
      })),
      subcatBreakdown,
      weekCompare,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
