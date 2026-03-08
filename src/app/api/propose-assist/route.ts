import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type CourseRow = {
  id: string
  name: string
  parent_club: string | null
  city: string | null
  state: string | null
}

let cachedCourses: CourseRow[] | null = null

async function getCourses(): Promise<CourseRow[]> {
  if (cachedCourses) return cachedCourses
  const { data } = await supabase
    .from('courses')
    .select('id, name, parent_club, city, state')
    .order('name')
  cachedCourses = data || []
  return cachedCourses
}

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

function buildCourseReference(courses: CourseRow[]): string {
  return courses.map(c => {
    const club = c.parent_club ? `${c.parent_club} - ` : ''
    const loc = [c.city, c.state].filter(Boolean).join(', ')
    return `ID: "${c.id}" | ${club}${c.name} | ${loc}`
  }).join('\n')
}

function buildSystemPrompt(courses: CourseRow[]): string {
  const dateRef = buildDateReference()
  const courseRef = buildCourseReference(courses)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `You are a conversational golf scheduling assistant (AI Caddie). You help users plan a round by chatting naturally. Ask follow-up questions to get the details you need — don't assume or guess.

Today is ${today}.

CRITICAL: Use this date reference to map day names to correct dates. Do NOT calculate dates yourself:
${dateRef}

Available courses in the system:
${courseRef}

Respond with ONLY valid JSON:
{"message":"Your conversational response","times":[{"dateTime":"YYYY-MM-DDTHH:mm","label":"DayName, Mon DD at H:MM AM/PM"}],"courses":[{"id":"course-uuid","name":"Display Name"}],"title":"Suggested title or null"}

CONVERSATION FLOW — this is critical. You need THREE things before generating a final proposal: WHEN, WHAT TIME, and WHERE.
1. If the user gives VAGUE availability (e.g. "this weekend", "Saturday", "any day except Wednesday") WITHOUT a specific time, DO NOT generate times yet. Instead, ask what time works. Example: "Saturday works! What time are you thinking — morning, afternoon, or a specific tee time?"
2. If you have the day and time but NO location/area/course yet, ask where they want to play BEFORE generating times. Example: "Afternoon next week, got it! Where are you looking to play — any particular area or course?"
3. Only generate times (non-empty times array) when you have ALL THREE: day(s), time preference, AND location/course.
4. If the user gives a SPECIFIC day AND time (e.g. "Saturday at 10am", "Sunday morning") but no location, ask where.
5. If the user gives MULTIPLE specific day+time combos (e.g. "Saturday 9am or Sunday 2pm"), still ask where if no location given.
6. If the user says "morning" with a day, use T08:00. "Afternoon" = T14:00. "Evening" = T17:00.
7. If the user says a day + "anytime" or "flexible", generate both a morning (T08:00) and afternoon (T14:00) option for that day.
8. If the user gives everything at once (day, time, AND location/course), set it all up in one response — no extra questions needed.

Rules for TIMES:
- ALWAYS look up dates from the reference above. Never guess dates.
- EXCLUSIONS: If user says "except Wednesday", "but not Wednesday", "except tuesday morning and wednesday night" etc. — EXCLUDE those entire days completely. Even if they only exclude a specific time on that day (like "wednesday night"), exclude ALL of Wednesday. When in doubt, exclude the day.
- "Any day" / "every day" = all 7 upcoming days (but still ask about time if not given)
- "Weekdays" = Mon-Fri only
- times = [] when you're still asking questions and don't have enough info yet

Rules for COURSES:
- When user mentions a location (city, area, neighborhood), suggest courses from the list above that are in or near that area.
- When user mentions a specific course or club name, match it from the list.
- Use the exact "id" from the course list. Use a display name like "Club - Course" or just "Course".
- courses = [] if no location or course info given
- Only suggest courses that exist in the list above. Never make up courses.

General:
- Be fun and brief in the message (golf-themed, 1-3 sentences)
- Ask ONE follow-up question at a time — don't overwhelm with multiple questions
- When you have day, time, AND course nailed down, give a confident summary like "All set! Saturday at 10am at Ibis - Tradition. Hit Create & Share to send it to your crew!"
- NEVER generate times without also having a course/location. If you have times but no location, set times=[] and ask where.`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const courses = await getCourses()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(courses) },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(text)
    let times: { dateTime: string; label: string }[] = Array.isArray(parsed.times) ? parsed.times : []

    // Server-side exclusion filter: scan ALL user messages for excluded days
    const allUserText = messages
      .filter((m: { role: string }) => m.role === 'user')
      .map((m: { content: string }) => m.content)
      .join(' ')
      .toLowerCase()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    // Check if exclusion keywords appear anywhere in the conversation
    const hasExclusionContext = /\b(except|but not|besides|excluding|not on|can'?t do|won'?t work|doesn'?t work|no good|off on|busy on|skip)\b/i.test(allUserText)

    for (const dayName of dayNames) {
      const shortName = dayName.slice(0, 3)
      let hasExclusion = false

      if (hasExclusionContext) {
        // If exclusion words are present, check if this day name appears near them
        // Use a broad window — the day name just needs to be in the same exclusion phrase
        hasExclusion =
          new RegExp(`(?:except|but not|besides|excluding|not on|can'?t do|won'?t work|doesn'?t work|skip|busy)\\b[^.!?]*\\b${dayName}`, 'i').test(allUserText) ||
          new RegExp(`(?:except|but not|besides|excluding|not on|can'?t do|won'?t work|doesn'?t work|skip|busy)\\b[^.!?]*\\b${shortName}\\b`, 'i').test(allUserText) ||
          new RegExp(`\\b${dayName}\\b[^.!?]*(?:won'?t|doesn'?t|can'?t|will not|does not|cannot|is out|no good|not good|is off|is bad)`, 'i').test(allUserText) ||
          new RegExp(`\\b${shortName}\\b[^.!?]*(?:won'?t|doesn'?t|can'?t|will not|does not|cannot|is out|no good|not good|is off|is bad)`, 'i').test(allUserText)
      }

      if (hasExclusion) {
        const dayIndex = dayNames.indexOf(dayName)
        times = times.filter(t => {
          const date = new Date(t.dateTime)
          return date.getDay() !== dayIndex
        })
      }
    }

    times = times.slice(0, 7)

    // Validate course IDs against actual courses
    let suggestedCourses: { id: string; name: string }[] = []
    if (Array.isArray(parsed.courses)) {
      const courseIds = new Set(courses.map(c => c.id))
      suggestedCourses = parsed.courses.filter((c: any) => c.id && courseIds.has(c.id))
    }

    return NextResponse.json({
      message: parsed.message || "I'm having trouble understanding. Can you rephrase?",
      times,
      courses: suggestedCourses,
      title: parsed.title || null,
    })
  } catch (error: any) {
    const errMsg = error?.message || 'Unknown error'
    console.error('Propose assist error:', errMsg)
    return NextResponse.json(
      { message: "Something went wrong. Try filling in the form manually below.", times: [], courses: [], title: null },
      { status: 500 }
    )
  }
}
