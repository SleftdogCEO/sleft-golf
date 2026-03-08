import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const client = new OpenAI()

const SYSTEM_PROMPT = `You are a golf scheduling assistant inside a "Propose a Round" feature. Users describe their availability and you extract structured data to fill out a proposal form.

Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Your job:
1. Parse natural language availability into specific date/time slots
2. Be conversational and fun (golf personality) but concise (1-2 sentences max)
3. Return ONLY valid JSON, nothing else

Respond with ONLY this JSON format, no other text:
{"message":"Your conversational response","times":[{"dateTime":"2026-03-15T08:00","label":"Saturday, Mar 15 at 8:00 AM"}],"title":"Suggested title"}

Rules for times:
- dateTime format: YYYY-MM-DDTHH:mm
- "morning" = 8:00 AM, "afternoon" = 2:00 PM
- "anytime" for a day = one slot at 8:00 AM (keep it simple)
- No time specified = default 8:00 AM
- "Any day except X" = all 7 upcoming days minus X
- "Weekdays" = Mon-Fri
- Always use upcoming dates, never past
- times = [] if no availability info given yet
- title = null if no good suggestion

Be brief and golf-themed in the message field.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)

    return NextResponse.json({
      message: parsed.message || "I'm having trouble understanding. Can you rephrase?",
      times: Array.isArray(parsed.times) ? parsed.times : [],
      title: parsed.title || null,
    })
  } catch (error: any) {
    const errMsg = error?.message || 'Unknown error'
    console.error('Propose assist error:', errMsg)
    return NextResponse.json(
      { message: "Something went wrong. Try filling in the form manually below.", times: [], title: null },
      { status: 500 }
    )
  }
}
