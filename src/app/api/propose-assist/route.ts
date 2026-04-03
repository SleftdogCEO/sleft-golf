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
  price_tier: number | null
  green_fee_estimate: number | null
  is_private: boolean
}

let cachedCourses: CourseRow[] | null = null
let cacheTime = 0

async function getCourses(): Promise<CourseRow[]> {
  // Cache for 5 minutes
  if (cachedCourses && Date.now() - cacheTime < 5 * 60 * 1000) return cachedCourses
  const { data } = await supabase
    .from('courses')
    .select('id, name, parent_club, city, state, price_tier, green_fee_estimate, is_private')
    .order('name')
  cachedCourses = data || []
  cacheTime = Date.now()
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
  const tierLabel = (t: number | null) => t === 1 ? '$' : t === 2 ? '$$' : t === 3 ? '$$$' : t === 4 ? '$$$$' : '?'
  return courses.map(c => {
    const club = c.parent_club ? `${c.parent_club} - ` : ''
    const loc = [c.city, c.state].filter(Boolean).join(', ')
    const price = c.price_tier ? ` | ${tierLabel(c.price_tier)}${c.green_fee_estimate ? ` ~$${c.green_fee_estimate}` : ''}` : ''
    const priv = c.is_private ? ' | PRIVATE' : ''
    return `ID: "${c.id}" | ${club}${c.name} | ${loc}${price}${priv}`
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
{"message":"Your conversational response","times":[{"dateTime":"YYYY-MM-DDTHH:mm","label":"DayName, Mon DD at H:MM AM/PM"}],"courses":[{"id":"course-uuid","name":"Display Name"}],"title":"Suggested title or null","players":null}

CONVERSATION FLOW — this is critical. You need FOUR things before generating a final proposal: WHEN, WHAT TIME, WHERE, and HOW MANY.
1. If the user gives VAGUE availability (e.g. "this weekend", "Saturday", "any day except Wednesday") WITHOUT a specific time, DO NOT generate times yet. Instead, ask what time works. Example: "Saturday works! What time are you thinking — morning, afternoon, or a specific tee time?"
2. If you have the day and time but NO location/area/course yet, ask where they want to play BEFORE generating times. Example: "Afternoon next week, got it! Where are you looking to play — any particular area or course?"
3. Once you have day, time, AND course — ask how many are playing. Example: "Ibis Heritage, Saturday morning — solid pick! How many players total, including you?"
4. Only generate times AND set players (non-empty times array + non-null players) when you have ALL FOUR: day(s), time preference, location/course, AND player count.
5. If the user gives a SPECIFIC day AND time (e.g. "Saturday at 10am", "Sunday morning") but no location, ask where.
6. If the user gives MULTIPLE specific day+time combos (e.g. "Saturday 9am or Sunday 2pm"), still ask where if no location given.
7. If the user says "morning" with a day, use T08:00. "Afternoon" = T14:00. "Evening" = T17:00.
8. If the user says a day + "anytime" or "flexible", generate both a morning (T08:00) and afternoon (T14:00) option for that day.
9. If the user gives everything at once (day, time, location/course, AND player count), set it all up in one response — no extra questions needed.

Rules for PLAYERS:
- "players" = the total number of confirmed players INCLUDING the person posting. Set to null until the user tells you.
- "Just me" / "solo" = 1. "Me and a buddy" / "2 of us" = 2. "Need a 4th" = they have 3 confirmed, looking for 1 more, so players = 3. "Full foursome" = 4.
- If user says "need a 3rd" that means 2 confirmed looking for 1 more, so players = 2.
- If user says "looking for players" without specifying, ask: "How many do you have confirmed so far, including yourself?"
- The app will let them open up extra spots for others to join after confirming their count.

Rules for TIMES:
- ALWAYS look up dates from the reference above. Never guess dates.
- EXCLUSIONS: If user says "except Wednesday", "but not Wednesday", "except tuesday morning and wednesday night" etc. — EXCLUDE those entire days completely. Even if they only exclude a specific time on that day (like "wednesday night"), exclude ALL of Wednesday. When in doubt, exclude the day.
- "Any day" / "every day" = all 7 upcoming days (but still ask about time if not given)
- "Weekdays" = Mon-Fri only
- times = [] when you're still asking questions and don't have enough info yet

Rules for COURSES:
- This app is for golfers ANYWHERE in America, not just one area. NEVER assume a location. Always ask generically: "Where are you looking to play?" or "Any specific course or area in mind?"
- When user mentions a location, check if any courses from the list match that area. If matches exist, suggest them.
- If the user mentions a location with NO matching courses in the database, that's OK — use a descriptive name as the course name (e.g. "Course in Austin, TX") and set the course id to "" (empty string). The user can still post a tee time without a database-linked course.
- When user mentions a specific course or club name, match it from the list if possible. If not in the list, use their stated name with id="".
- Use the exact "id" from the course list when available. Use a display name like "Club - Course" or just "Course".
- courses = [] if no location or course info given
- IMPORTANT: When suggesting courses for an area, suggest 3-5 courses from DIFFERENT clubs/venues. Do NOT just list multiple courses from the same club. Variety is key.
- Each course has a price tier: $ (under $50), $$ ($50-100), $$$ ($100-200), $$$$ ($200+/private).
- If user mentions budget (e.g. "cheap", "affordable", "budget", "nothing too expensive"), prefer $ and $$ courses.
- If user mentions wanting premium/nice/upscale courses, prefer $$$ and $$$$ courses.
- Courses marked PRIVATE require membership — mention this if suggesting them.
- Don't mention prices in your message — the UI shows price badges on course chips automatically.

General:
- Be fun and brief in the message (golf-themed, 1-3 sentences)
- Ask ONE follow-up question at a time — don't overwhelm with multiple questions
- When you have day, time, course, AND player count nailed down, give a confident summary like "All set! 3 players, Saturday at 10am at Ibis - Tradition. Hit Post!"
- NEVER generate times without also having a course/location. If you have times but no location, set times=[] and ask where.
- NEVER set players to a non-null value without also having times and courses ready. If you know the player count but not the rest, keep players=null and keep asking.
- If the user mentions needing extra players (e.g. "need a 3rd", "need a 4th", "looking for players"), acknowledge it — the app will let them set group size when posting.
- IMPORTANT: Do NOT list or enumerate courses in your message text. The UI will display course chips automatically from the courses array. Just reference them naturally (e.g. "Found some great options near West Palm!" not "Here are the courses: 1. Ibis - Tradition 2. PGA National..."). Keep your message short — the data speaks for itself.
- The UI shows quick-reply buttons for time of day (Morning, Afternoon, Evening, Anytime) when you ask about time. So keep your time question simple and natural.`
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

    // Validate course IDs against actual courses and attach pricing
    const courseMap = new Map(courses.map(c => [c.id, c]))
    let suggestedCourses: { id: string; name: string; price_tier: number | null; green_fee_estimate: number | null; is_private: boolean }[] = []
    if (Array.isArray(parsed.courses)) {
      suggestedCourses = parsed.courses
        .filter((c: any) => c.name) // Must have a name at minimum
        .map((c: any) => {
          const full = c.id && courseMap.has(c.id) ? courseMap.get(c.id)! : null
          return {
            id: full ? c.id : '',
            name: c.name,
            price_tier: full?.price_tier ?? null,
            green_fee_estimate: full?.green_fee_estimate ?? null,
            is_private: full?.is_private ?? false,
          }
        })
    }

    return NextResponse.json({
      message: parsed.message || "I'm having trouble understanding. Can you rephrase?",
      times,
      courses: suggestedCourses,
      title: parsed.title || null,
      players: typeof parsed.players === 'number' ? parsed.players : null,
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
