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

function buildDateReference(timezone: string): string {
  // Use the user's timezone to determine "today"
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en-US', { ...opts, timeZone: timezone })

  const now = new Date()
  const todayStr = fmt(now, { year: 'numeric', month: '2-digit', day: '2-digit' })
  const [m, d, y] = todayStr.split('/')
  const todayDate = new Date(`${y}-${m}-${d}T12:00:00`)

  const lines: string[] = []
  for (let i = 0; i < 14; i++) {
    const date = new Date(todayDate)
    date.setDate(date.getDate() + i)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const dayNum = date.getDate()
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const label = i === 0 ? ' (TODAY - this is today!)' : i === 1 ? ' (tomorrow)' : ''
    lines.push(`${dayName}, ${month} ${dayNum}${label} → dateTime: "${yyyy}-${mm}-${dd}"`)
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

function buildSystemPrompt(courses: CourseRow[], timezone: string): string {
  const dateRef = buildDateReference(timezone)
  const courseRef = buildCourseReference(courses)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `You are a conversational golf scheduling assistant (AI Caddie). You help users plan a round by chatting naturally. Ask follow-up questions to get the details you need — don't assume or guess.

Today is ${today}.

CRITICAL: Use this date reference to map day names to correct dates. Do NOT calculate dates yourself:
${dateRef}

Available courses in the system:
${courseRef}

Respond with ONLY valid JSON:
{"message":"Your conversational response","times":[{"dateTime":"YYYY-MM-DDTHH:mm","label":"DayName, Mon DD at H:MM AM/PM"}],"courses":[{"id":"course-uuid","name":"Display Name"}],"title":"Suggested title or null","confirmed":null,"open_spots":0}

CONVERSATION FLOW — this is critical. You need FOUR things before generating a final proposal: WHEN, WHAT TIME, WHERE, and HOW MANY.
1. If the user gives VAGUE availability (e.g. "this weekend", "Saturday", "any day except Wednesday") WITHOUT a specific time, DO NOT generate times yet. Instead, ask what time works. Example: "Saturday works! What time are you thinking — morning, afternoon, or a specific tee time?"
2. If you have the day and time but NO location/area/course yet, ask where they want to play BEFORE generating times. Example: "Afternoon next week, got it! Where are you looking to play — any particular area or course?"
3. Once you have day, time, AND course — include the course in the courses array AND include the time in the times array. Then ask how many are playing. Example: with courses and times populated, confirmed=null, ask: "How many players total, including you?"
4. Keep confirmed=null until the user EXPLICITLY tells you how many players. Do NOT default to 1 player. Do NOT skip asking about player count.
5. If the user gives a SPECIFIC day AND time (e.g. "Saturday at 10am", "Sunday morning") but no location, ask where.
6. If the user gives MULTIPLE specific day+time combos (e.g. "Saturday 9am or Sunday 2pm"), still ask where if no location given.
7. If the user says "morning" with a day, use T08:00. "Afternoon" = T14:00. "Evening" = T17:00.
8. If the user says a day + "anytime" or "flexible", generate both a morning (T08:00) and afternoon (T14:00) option for that day.
9. If the user gives everything at once (day, time, location/course, AND player count), set it all up in one response — no extra questions needed.

PROGRESSIVE DATA — the frontend accumulates data across messages. You MUST include data as soon as you have it:
- Include the course in "courses" as soon as the user picks one. Keep including it in EVERY subsequent response.
- Include times in "times" as soon as you know the day + time of day + course. Keep including them in EVERY subsequent response.
- Only "confirmed" should remain null until player count is given.
- CRITICAL FOR FINAL RESPONSE: When the user gives the player count and you have all 4 pieces, you MUST populate ALL JSON fields: times (with dateTime and label), courses (with id and name), confirmed (number), open_spots (number), and title (descriptive string like "Round at [Course Name]"). An "All set!" message with empty arrays BREAKS THE UI — the Post button will not appear. This is the most important rule.

Rules for PLAYERS:
- "confirmed" = number of confirmed players INCLUDING the person posting. Set to null until the user tells you.
- "open_spots" = number of ADDITIONAL players they are looking for. Default 0.
- "Just me" / "solo" = confirmed:1, open_spots:0. "Me and a buddy" / "2 of us" = confirmed:2, open_spots:0.
- "Need a 4th" = confirmed:3, open_spots:1. "Need a 3rd" = confirmed:2, open_spots:1.
- "Full foursome" = confirmed:4, open_spots:0. "3 of us, looking for 1 more" = confirmed:3, open_spots:1.
- "Looking for players" without specifying = ask: "How many do you have confirmed, and how many more do you need?"
- If user gives ONLY a total (e.g. "4 players") with no mention of needing more, set confirmed to that number with open_spots:0.

Rules for TIMES:
- ALWAYS look up dates from the reference above. Never guess dates.
- EXCLUSIONS: If user says "except Wednesday", "but not Wednesday", "except tuesday morning and wednesday night" etc. — EXCLUDE those entire days completely. Even if they only exclude a specific time on that day (like "wednesday night"), exclude ALL of Wednesday. When in doubt, exclude the day.
- "Any day" / "every day" = all 7 upcoming days (but still ask about time if not given)
- "Weekdays" = Mon-Fri only
- times = [] when you're still asking questions and don't have enough info yet

Rules for COURSES:
- This app is for golfers ANYWHERE in America, not just one area. NEVER assume a location. Always ask generically: "Where are you looking to play?" or "Any specific course or area in mind?"
- When user mentions a SPECIFIC course by name (e.g. "Ibis Heritage", "Bethpage Black", "TPC Sawgrass"), match it from the list and use it. Do NOT show other options — they already know where they want to play.
- When user mentions just an AREA (e.g. "West Palm Beach", "Tampa", "Boston"), do NOT immediately suggest courses. Instead, ask: "Got it! Do you have a specific course in mind, or want me to suggest some options?" Set courses=[] and wait for their answer.
- If user says "suggest some" or "what's around there", THEN show 3-5 courses. Only suggest courses whose CITY matches or is very close to the area mentioned. Check the city field carefully — do NOT suggest courses from other cities/regions.
- If the user mentions a location with NO matching courses in the database, that's OK — use a descriptive name as the course name (e.g. "Course in Austin, TX") and set the course id to "" (empty string).
- Use the exact "id" from the course list when available.
- courses = [] if no location or course info given, or if you're still asking which course.
- When suggesting courses, pick from DIFFERENT clubs/venues. Variety is key.
- Each course has a price tier: $ (under $50), $$ ($50-100), $$$ ($100-200), $$$$ ($200+/private).
- If user mentions budget (e.g. "cheap", "affordable", "budget", "nothing too expensive"), prefer $ and $$ courses.
- If user mentions wanting premium/nice/upscale courses, prefer $$$ and $$$$ courses.
- Courses marked PRIVATE require membership — mention this if suggesting them.
- Don't mention prices in your message — the UI shows price badges on course chips automatically.

General:
- Be fun and brief in the message (golf-themed, 1-3 sentences)
- Ask ONE follow-up question at a time — don't overwhelm with multiple questions
- When you have day, time, course, AND player count nailed down, give a confident summary like "All set! 3 players, Saturday at 10am at Ibis - Tradition. Hit Post!" AND you MUST populate times, courses, confirmed, open_spots, and title in the JSON. Never give this summary with empty arrays.
- NEVER generate times without also having a course/location. If you have times but no location, set times=[] and ask where.
- NEVER set confirmed to a non-null value without also having times and courses ready.
- If the user mentions needing extra players (e.g. "need a 3rd", "need a 4th", "looking for players"), acknowledge it — the app will let them set group size when posting.
- IMPORTANT: Do NOT list or enumerate courses in your message text. The UI will display course chips automatically from the courses array. Just reference them naturally (e.g. "Found some great options near West Palm!" not "Here are the courses: 1. Ibis - Tradition 2. PGA National..."). Keep your message short — the data speaks for itself.
- IMPORTANT: Once the user has selected a specific course, ONLY include that one course in the courses array going forward. Do NOT keep showing all the options after they've picked one.
- The UI shows quick-reply buttons for time of day (Morning, Afternoon, Evening, Anytime) when you ask about time. So keep your time question simple and natural.
- REMEMBER: The structured JSON data (times, courses, confirmed) is what drives the UI, not your message text. If your message says "All set" but the arrays are empty, the user sees NO Post button. Always match your JSON data to what your message describes.`
}

export async function POST(req: NextRequest) {
  try {
    const { messages, timezone } = await req.json()
    const tz = timezone || 'America/New_York'
    const courses = await getCourses()

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(courses, tz) },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const text = response.choices[0]?.message?.content || '{}'
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      console.error('GPT returned invalid JSON:', text.slice(0, 500))
      // Try to extract message from partial JSON
      const msgMatch = text.match(/"message"\s*:\s*"([^"]*)"/)
      return NextResponse.json({
        message: msgMatch?.[1] || "Sorry, I got confused. Can you try again?",
        times: [], courses: [], title: null, confirmed: null, open_spots: 0,
      })
    }
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

    let confirmed: number | null = typeof parsed.confirmed === 'number' ? parsed.confirmed : null

    // Safety net: if AI gave a final-sounding message but forgot structured data,
    // recover courses/times/confirmed from conversation context
    const isFinalMsg = /all set|hit post|ready to post|let'?s go|you'?re all set|book it/i.test(parsed.message || '')
    if (isFinalMsg && (times.length === 0 || suggestedCourses.length === 0 || confirmed == null)) {
      const allConvoText = messages.map((m: { content: string }) => m.content).join(' ')

      // Recover courses: match course names from conversation against DB
      if (suggestedCourses.length === 0) {
        for (const c of courses) {
          const names = [c.name.toLowerCase()]
          if (c.parent_club) names.push(c.parent_club.toLowerCase())
          if (names.some(n => allConvoText.toLowerCase().includes(n))) {
            suggestedCourses = [{
              id: c.id,
              name: c.parent_club ? `${c.parent_club} - ${c.name}` : c.name,
              price_tier: c.price_tier ?? null,
              green_fee_estimate: c.green_fee_estimate ?? null,
              is_private: c.is_private,
            }]
            break
          }
        }
      }

      // Recover confirmed: pattern match player count from conversation
      if (confirmed == null) {
        const lower = allConvoText.toLowerCase()
        if (/\bjust me\b|\bsolo\b|\bjust myself\b|\b1 player\b/.test(lower)) confirmed = 1
        else if (/\b2 of us\b|\btwo of us\b|\bme and (a |my )?(buddy|friend|partner)\b|\b2 players\b/.test(lower)) confirmed = 2
        else if (/\b3 of us\b|\bthree of us\b|\b3 players\b|\bneed a 4th\b/.test(lower)) confirmed = 3
        else if (/\bfull foursome\b|\b4 of us\b|\bfour of us\b|\b4 players\b/.test(lower)) confirmed = 4
      }

      // Recover times: extract day + time-of-day from conversation
      if (times.length === 0) {
        let hour = 8 // default morning
        const lower = allConvoText.toLowerCase()
        if (/\bafternoon\b/.test(lower)) hour = 14
        else if (/\bevening\b/.test(lower)) hour = 17

        const dateRef = buildDateReference(tz)
        for (const line of dateRef.split('\n')) {
          const dayMatch = line.match(/^(\w+),\s*(\w+)\s+(\d+)/)
          const dateTimeMatch = line.match(/dateTime:\s*"(\d{4}-\d{2}-\d{2})"/)
          if (!dayMatch || !dateTimeMatch) continue

          const dayName = dayMatch[1].toLowerCase()
          const isToday = line.includes('TODAY')
          const isTomorrow = line.includes('tomorrow')

          if (
            (isToday && lower.includes('today')) ||
            (isTomorrow && lower.includes('tomorrow')) ||
            lower.includes(dayName) ||
            lower.includes(dayName.slice(0, 3))
          ) {
            const hh = String(hour).padStart(2, '0')
            const ampm = hour >= 12 ? 'PM' : 'AM'
            const displayHour = hour > 12 ? hour - 12 : hour
            times = [{
              dateTime: `${dateTimeMatch[1]}T${hh}:00`,
              label: `${dayMatch[1]}, ${dayMatch[2]} ${dayMatch[3]} at ${displayHour}:00 ${ampm}`,
            }]
            break
          }
        }
      }
    }

    return NextResponse.json({
      message: parsed.message || "I'm having trouble understanding. Can you rephrase?",
      times,
      courses: suggestedCourses,
      title: parsed.title || null,
      confirmed,
      open_spots: typeof parsed.open_spots === 'number' ? parsed.open_spots : 0,
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
