import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/suggest-activity
 *
 * Accepts a plain-language description of what the user wants to schedule
 * and returns AI-generated suggestions for activity name, duration, and tags.
 *
 * Requires OPENAI_API_KEY in .env.local to be active.
 * Returns a "not configured" message if the key is missing.
 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI features are not configured yet. Add your OPENAI_API_KEY to .env.local to enable them.' },
      { status: 503 }
    );
  }

  const { description, libraryTags } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }

  const systemPrompt = `You are a scheduling assistant for caregivers of children with special needs.
Given a plain-language description of an activity, suggest:
- A short, clear activity name (3-5 words max)
- A recommended duration in minutes (multiples of 5, between 5 and 120)
- Which tags from the provided library are relevant (return their exact labels)

Respond ONLY with valid JSON in this shape:
{
  "name": "Morning Circle",
  "duration": 30,
  "suggestedTags": ["Greeting", "Calendar time"]
}`;

  const userPrompt = `Activity description: "${description}"
Available library tags: ${JSON.stringify(libraryTags ?? [])}`;

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
        temperature: 0.4,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.error?.message ?? 'OpenAI error' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';

    // Strip markdown code fences if present
    const cleaned = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
