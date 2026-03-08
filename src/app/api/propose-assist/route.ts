import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const client = new OpenAI()

function buildDateReference(): string {
  const now = new Date()
  const lines: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })
    const month = d.toLocaleDateString('en-US', { month: 'short' })
    const day = d.getDate()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const label = i === 0 ? ' (today)' : i === 1 ? ' (tomorrow)' : ''
    lines.push(`${dayName}, ${month} ${day}${label} → dateTime: "${yyyy}-${mm}-${dd}"`)
  }
  return lines.join('\n')
}

function buildSystemPrompt(): string {
  const dateRef = buildDateReference()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `You are a golf scheduling assistant. Users describe availability and you return structured time slots.

Today is ${today}.

CRITICAL: Use this date reference to map day names to correct dates. Do NOT calculate dates yourself:
${dateRef}

Respond with ONLY valid JSON:
{"message":"Brief golf-themed response (1-2 sentences)","times":[{"dateTime":"YYYY-MM-DDTHH:mm","label":"DayName, Mon DD at H:MM AM/PM"}],"title":"Suggested title or null"}

Rules:
- ALWAYS look up dates from the reference above. Never guess dates.
- "morning" = T08:00, "afternoon" = T14:00, no time specified = T08:00
- EXCLUSIONS ARE CRITICAL: If user says "except Wednesday", "but not Wednesday", "anything but Wednesday", "can't do Wednesday", "Wednesday won't work", etc. — you MUST exclude ALL dates that fall on that day of the week. Double-check each date's day name before including it.
- "Any day" / "every day" / "anything" without exclusion = all 7 upcoming days
- "Weekdays" = Mon-Fri only
- times = [] if no availability info given
- Be fun and brief in the message`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)
    let times: { dateTime: string; label: string }[] = Array.isArray(parsed.times) ? parsed.times : []

    // Server-side exclusion filter: if user mentioned excluding a day, remove it
    const userText = messages[messages.length - 1]?.content?.toLowerCase() || ''
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const excludePatterns = /(?:except|but not|but|besides|other than|excluding|not|can't do|cant do|won't work|wont work|doesn't work|doesnt work|no)\s+(?:for\s+)?/i

    for (const dayName of dayNames) {
      const shortName = dayName.slice(0, 3)
      // Check if this day is mentioned in an exclusion context
      const hasExclusion =
        new RegExp(`(?:except|but not|but|besides|excluding|not|can't do|cant do|won't work|wont work|doesn't work|doesnt work)\\s+(?:for\\s+)?(?:\\w+\\s+(?:and|or|,)\\s+)*${dayName}`, 'i').test(userText) ||
        new RegExp(`(?:except|but not|but|besides|excluding|not|can't do|cant do|won't work|wont work|doesn't work|doesnt work)\\s+(?:for\\s+)?(?:\\w+\\s+(?:and|or|,)\\s+)*${shortName}\\b`, 'i').test(userText) ||
        new RegExp(`${dayName}\\s+(?:won't|wont|doesn't|doesnt|can't|cant|will not|does not|cannot)\\s+work`, 'i').test(userText) ||
        new RegExp(`${dayName}\\s+(?:is|are)\\s+(?:out|no good|not good|bad|off)`, 'i').test(userText)

      if (hasExclusion) {
        const dayIndex = dayNames.indexOf(dayName)
        times = times.filter(t => {
          const date = new Date(t.dateTime)
          return date.getDay() !== dayIndex
        })
      }
    }

    // Cap at 7 slots to keep the form manageable
    times = times.slice(0, 7)

    return NextResponse.json({
      message: parsed.message || "I'm having trouble understanding. Can you rephrase?",
      times,
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
