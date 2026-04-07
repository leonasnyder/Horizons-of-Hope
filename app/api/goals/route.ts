import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const goals = await sql`SELECT * FROM goals ORDER BY name`;
    const subcats = await sql`SELECT * FROM goal_subcategories WHERE is_active = 1 ORDER BY goal_id, label`;
    const result = (goals as unknown as Array<{ id: number } & Record<string, unknown>>).map(g => ({
      ...g,
      subcategories: (subcats as unknown as Array<{ goal_id: number } & Record<string, unknown>>).filter(s => s.goal_id === g.id),
    }));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, color, subcategories } = body;
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const maxResult = await sql`SELECT COALESCE(MAX(sort_order), -1) as m FROM goals`;
    const m = maxResult[0].m;

    const [goal] = await sql`
      INSERT INTO goals (name, description, color, sort_order)
      VALUES (${name}, ${description ?? null}, ${color ?? '#0EA5E9'}, ${Number(m) + 1})
      RETURNING *
    `;

    if (Array.isArray(subcategories)) {
      for (let i = 0; i < subcategories.length; i++) {
        const s = subcategories[i];
        await sql`
          INSERT INTO goal_subcategories (goal_id, response_type, label, sort_order)
          VALUES (${goal.id}, ${s.response_type}, ${s.label}, ${s.sort_order ?? i})
        `;
      }
    }

    const subs = await sql`SELECT * FROM goal_subcategories WHERE goal_id = ${goal.id}`;
    return NextResponse.json({ ...goal, subcategories: subs }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
