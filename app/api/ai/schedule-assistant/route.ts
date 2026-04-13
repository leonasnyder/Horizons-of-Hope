import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/schedule-assistant
 *
 * Accepts the current day's schedule and a plain-English request,
 * returns a structured list of actions to apply to the schedule.
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

  const { message, entries, activities, date } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const systemPrompt = `You are a scheduling assistant for caregivers of children with special needs.
You will receive the current day's schedule and a plain-English request to modify it.
Return ONLY valid JSON with this exact shape — no markdown, no explanation:
{
  "summary": "One sentence describing what you will do",
  "actions": [
    // One or more of these action types:

    // Shift all incomplete activities by N minutes (positive = later, negative = earlier)
    { "type": "shift_all", "minutes": 30, "onlyIncomplete": true },

    // Update a specific entry's time and/or duration
    { "type": "update_entry", "entryId": 123, "time_slot": "09:30", "duration_minutes": 45 },

    // Remove a specific entry from today's schedule
    { "type": "remove_entry", "entryId": 123 },

    // Replace a specific entry with a different activity (from the available list)
    { "type": "replace_entry", "entryId": 123, "activityId": 456, "time_slot": "12:00", "duration_minutes": 30 }
  ]
}

Rules:
- Time slots must be in HH:MM 24-hour format
- Only reference entryIds and activityIds that exist in the data provided
- For shifting, prefer shift_all over updating each entry individually
- If you cannot fulfill the request, return { "summary": "I couldn't do that — [reason]", "actions": [] }
- Never modify completed activities unless the user explicitly asks`;

  const scheduleText = entries.length === 0
    ? 'No activities scheduled for today.'
    : entries.map((e: {
        id: number; activity_name: string; time_slot: string;
        duration_minutes: number; is_completed: number;
      }) =>
        `- ID:${e.id} | ${e.activity_name} | ${e.time_slot} | ${e.duration_minutes}min | ${e.is_completed ? 'COMPLETED' : 'incomplete'}`
      ).join('\n');

  const activitiesText = activities.length === 0
    ? 'No activities in library.'
    : activities.map((a: { id: number; name: string; category: string | null }) =>
        `- ID:${a.id} | ${a.name}${a.category ? ` (${a.category})` : ''}`
      ).join('\n');

  const userPrompt = `Date: ${date}

Current schedule:
${scheduleText}

Available activities to use for replacements:
${activitiesText}

User request: "${message}"`;

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
        temperature: 0.2,
        max_tokens: 500,
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
