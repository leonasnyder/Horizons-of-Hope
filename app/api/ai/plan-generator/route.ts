import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/plan-generator
 *
 * Accepts a plain-English plan description and the user's activity library.
 * Returns a structured list of plan actions: either scheduling an existing activity
 * by ID, or defining a new activity to create and then schedule.
 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI features are not configured yet. Add your OPENAI_API_KEY to enable them.' },
      { status: 503 }
    );
  }

  const { description, activities, date, existingEntries } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }

  const systemPrompt = `You are a scheduling assistant for caregivers of children with special needs.
You will receive a plan description and a library of existing activities.
Generate a sequence of time-blocked activities for the plan.

Return ONLY valid JSON with this exact shape — no markdown, no explanation:
{
  "summary": "One sentence describing the plan you are creating",
  "actions": [
    // Use an existing activity from the library:
    { "type": "schedule_existing", "activityId": 123, "time_slot": "08:00", "duration_minutes": 30 },

    // Create a brand-new activity (when no good match exists in the library):
    {
      "type": "create_and_schedule",
      "time_slot": "08:30",
      "duration_minutes": 20,
      "newActivity": {
        "name": "Morning Stretches",
        "category": "Physical",
        "duration_minutes": 20,
        "time_slot": "08:30",
        "sub_labels": ["Arm circles", "Toe touches", "Deep breaths"]
      }
    }
  ]
}

Rules:
- Time slots must be in HH:MM 24-hour format
- Activities should be sequenced with no overlap
- Prefer using existing activities from the library (schedule_existing) when a good match exists
- Only create new activities (create_and_schedule) when there is no reasonable match in the library
- Keep sub_labels short (2–5 words each), include 2–4 per new activity
- Plan should be realistic and appropriate for a child with special needs
- Typical activity duration: 15–45 minutes
- Do NOT schedule over activities that are already on the calendar for today
- If you cannot create a reasonable plan, return { "summary": "I couldn\\'t do that — [reason]", "actions": [] }`;

  const activitiesText = activities.length === 0
    ? 'No activities in library.'
    : activities.map((a: { id: number; name: string; category: string | null }) =>
        `- ID:${a.id} | ${a.name}${a.category ? ` (${a.category})` : ''}`
      ).join('\n');

  const existingText = existingEntries?.length === 0
    ? 'No activities scheduled yet today.'
    : (existingEntries ?? []).map((e: {
        id: number; activity_name: string; time_slot: string; duration_minutes: number;
      }) =>
        `- ${e.activity_name} | ${e.time_slot} | ${e.duration_minutes}min`
      ).join('\n');

  const userPrompt = `Date: ${date}

Plan request: "${description}"

Activity library (prefer using these):
${activitiesText}

Already scheduled today (do NOT overlap with these):
${existingText}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message ?? 'OpenAI error' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const cleaned = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
