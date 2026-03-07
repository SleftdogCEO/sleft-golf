/**
 * Smart natural language availability parser.
 * Handles patterns like:
 *   "Saturday morning or Sunday after 2"
 *   "Friday at 10am, Saturday anytime"
 *   "next week Tuesday 8am"
 *   "tomorrow afternoon"
 *   "March 15 at 7:30"
 */

import {
  addDays,
  nextSaturday,
  nextSunday,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  setHours,
  setMinutes,
  startOfDay,
  isAfter,
  format,
} from 'date-fns'

type ParsedSlot = {
  dateTime: string // ISO string for datetime-local input (YYYY-MM-DDTHH:mm)
  label: string    // Human-readable label
}

const DAY_MAP: Record<string, (date: Date) => Date> = {
  monday: nextMonday,
  mon: nextMonday,
  tuesday: nextTuesday,
  tue: nextTuesday,
  tues: nextTuesday,
  wednesday: nextWednesday,
  wed: nextWednesday,
  thursday: nextThursday,
  thu: nextThursday,
  thur: nextThursday,
  thurs: nextThursday,
  friday: nextFriday,
  fri: nextFriday,
  saturday: nextSaturday,
  sat: nextSaturday,
  sunday: nextSunday,
  sun: nextSunday,
}

const TIME_PRESETS: Record<string, [number, number]> = {
  'early morning': [6, 30],
  'early': [7, 0],
  'morning': [8, 0],
  'mid morning': [9, 30],
  'midmorning': [9, 30],
  'late morning': [10, 30],
  'noon': [12, 0],
  'lunch': [12, 0],
  'lunchtime': [12, 0],
  'early afternoon': [13, 0],
  'afternoon': [14, 0],
  'mid afternoon': [15, 0],
  'late afternoon': [16, 0],
  'evening': [17, 0],
}

const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
}

function parseTime(text: string): [number, number] | null {
  // Check preset times first
  const lower = text.toLowerCase().trim()
  for (const [preset, time] of Object.entries(TIME_PRESETS)) {
    if (lower.includes(preset)) return time
  }

  // "after X" pattern -> X + 0:00
  const afterMatch = lower.match(/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (afterMatch) {
    let hour = parseInt(afterMatch[1])
    const min = afterMatch[2] ? parseInt(afterMatch[2]) : 0
    const ampm = afterMatch[3]?.toLowerCase()
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
    if (!ampm && hour < 7) hour += 12 // assume PM for small numbers
    return [hour, min]
  }

  // "before X" pattern -> X - 1:00
  const beforeMatch = lower.match(/before\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (beforeMatch) {
    let hour = parseInt(beforeMatch[1])
    const min = beforeMatch[2] ? parseInt(beforeMatch[2]) : 0
    const ampm = beforeMatch[3]?.toLowerCase()
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
    if (!ampm && hour < 7) hour += 12
    return [Math.max(6, hour - 1), min]
  }

  // "around X" pattern
  const aroundMatch = lower.match(/around\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (aroundMatch) {
    let hour = parseInt(aroundMatch[1])
    const min = aroundMatch[2] ? parseInt(aroundMatch[2]) : 0
    const ampm = aroundMatch[3]?.toLowerCase()
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
    if (!ampm && hour < 7) hour += 12
    return [hour, min]
  }

  // Direct time: "10am", "2:30pm", "14:00", "7:30 am"
  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (timeMatch) {
    let hour = parseInt(timeMatch[1])
    const min = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const ampm = timeMatch[3].toLowerCase()
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
    return [hour, min]
  }

  // 24h format: "14:00", "08:30"
  const time24Match = lower.match(/\b(\d{1,2}):(\d{2})\b/)
  if (time24Match) {
    const hour = parseInt(time24Match[1])
    const min = parseInt(time24Match[2])
    if (hour >= 0 && hour <= 23) return [hour, min]
  }

  // Bare number with "at": "at 2", "at 10"
  const atMatch = lower.match(/at\s+(\d{1,2})\b/)
  if (atMatch) {
    let hour = parseInt(atMatch[1])
    if (hour < 7) hour += 12 // assume PM
    return [hour, 0]
  }

  // "anytime" -> give morning and afternoon options
  if (lower.includes('anytime') || lower.includes('any time') || lower.includes('all day') || lower.includes('flexible')) {
    return null // signal to generate multiple slots
  }

  return null
}

function parseDate(text: string, referenceDate: Date): Date | null {
  const lower = text.toLowerCase().trim()
  const today = startOfDay(referenceDate)

  // "today"
  if (lower.includes('today')) return today

  // "tomorrow"
  if (lower.includes('tomorrow') || lower.includes('tmrw') || lower.includes('tmw')) {
    return addDays(today, 1)
  }

  // "this weekend"
  if (lower.includes('this weekend')) {
    return nextSaturday(today)
  }

  // "next weekend"
  if (lower.includes('next weekend')) {
    return addDays(nextSaturday(today), 7)
  }

  // "next week" + day
  const nextWeekDayMatch = lower.match(/next\s+week\s+(\w+)/)
  if (nextWeekDayMatch) {
    const dayFn = DAY_MAP[nextWeekDayMatch[1].toLowerCase()]
    if (dayFn) {
      const nextDay = dayFn(today)
      return addDays(nextDay, 7)
    }
  }

  // "next [day]" or "this [day]"
  const nextDayMatch = lower.match(/(?:next|this)\s+(\w+)/)
  if (nextDayMatch) {
    const dayFn = DAY_MAP[nextDayMatch[1].toLowerCase()]
    if (dayFn) return dayFn(today)
  }

  // Just a day name: "saturday", "fri"
  for (const [dayName, dayFn] of Object.entries(DAY_MAP)) {
    if (lower.includes(dayName)) {
      const candidate = dayFn(today)
      return candidate
    }
  }

  // "March 15" / "Mar 15" / "3/15"
  for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
    const monthPattern = new RegExp(`${monthName}\\s+(\\d{1,2})`)
    const match = lower.match(monthPattern)
    if (match) {
      const day = parseInt(match[1])
      const year = referenceDate.getFullYear()
      const date = new Date(year, monthNum, day)
      if (!isAfter(date, today)) date.setFullYear(year + 1)
      return date
    }
  }

  // Numeric date: "3/15", "03/15"
  const numericMatch = lower.match(/(\d{1,2})\/(\d{1,2})/)
  if (numericMatch) {
    const month = parseInt(numericMatch[1]) - 1
    const day = parseInt(numericMatch[2])
    const year = referenceDate.getFullYear()
    const date = new Date(year, month, day)
    if (!isAfter(date, today)) date.setFullYear(year + 1)
    return date
  }

  return null
}

function toDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function parseAvailability(input: string): ParsedSlot[] {
  const now = new Date()
  const slots: ParsedSlot[] = []

  // Split on common separators: "or", ",", "&", "and", "/"
  const segments = input
    .split(/\s*(?:,|\bor\b|\band\b|&|\/)\s*/i)
    .map(s => s.trim())
    .filter(Boolean)

  for (const segment of segments) {
    const date = parseDate(segment, now)
    if (!date) continue

    const time = parseTime(segment)

    const isAnytime = /\b(anytime|any\s*time|all\s*day|flexible|whenever)\b/i.test(segment)

    if (isAnytime) {
      // Generate morning + afternoon slots
      const morning = setMinutes(setHours(new Date(date), 8), 0)
      const afternoon = setMinutes(setHours(new Date(date), 14), 0)
      slots.push({
        dateTime: toDateTimeLocal(morning),
        label: `${format(date, 'EEEE, MMM d')} - Morning (8:00 AM)`,
      })
      slots.push({
        dateTime: toDateTimeLocal(afternoon),
        label: `${format(date, 'EEEE, MMM d')} - Afternoon (2:00 PM)`,
      })
    } else if (time) {
      const dateWithTime = setMinutes(setHours(new Date(date), time[0]), time[1])
      slots.push({
        dateTime: toDateTimeLocal(dateWithTime),
        label: `${format(date, 'EEEE, MMM d')} at ${format(dateWithTime, 'h:mm a')}`,
      })
    } else {
      // No time specified, default to 8am tee time
      const dateWithTime = setMinutes(setHours(new Date(date), 8), 0)
      slots.push({
        dateTime: toDateTimeLocal(dateWithTime),
        label: `${format(date, 'EEEE, MMM d')} at 8:00 AM`,
      })
    }
  }

  // Handle "this weekend" as a single segment that should produce sat + sun
  if (/this\s+weekend/i.test(input) && segments.length === 1) {
    const sat = nextSaturday(startOfDay(now))
    const sun = addDays(sat, 1)
    const time = parseTime(input)
    const h = time ? time[0] : 8
    const m = time ? time[1] : 0
    return [
      { dateTime: toDateTimeLocal(setMinutes(setHours(sat, h), m)), label: `${format(sat, 'EEEE, MMM d')} at ${format(setMinutes(setHours(sat, h), m), 'h:mm a')}` },
      { dateTime: toDateTimeLocal(setMinutes(setHours(sun, h), m)), label: `${format(sun, 'EEEE, MMM d')} at ${format(setMinutes(setHours(sun, h), m), 'h:mm a')}` },
    ]
  }

  return slots
}
