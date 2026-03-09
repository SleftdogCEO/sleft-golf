'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Award,
  Users,
  X,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addDays,
} from 'date-fns'

type AvailabilityEntry = {
  id: string
  user_id: string
  date: string
  status: 'open' | 'closed'
  note: string | null
  created_at: string
  profiles?: {
    id: string
    full_name: string
    avatar_url: string | null
    username: string
    handicap: number | null
    location: string | null
  }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const supabase = createClient()
  const { userId, profile } = useUser()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [myAvailability, setMyAvailability] = useState<AvailabilityEntry[]>([])
  const [allAvailability, setAllAvailability] = useState<AvailabilityEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [noteDate, setNoteDate] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // Date range for fetching
  const dateRange = useMemo(() => {
    const first = calendarDays[0]
    const last = calendarDays[calendarDays.length - 1]
    return {
      start: format(first, 'yyyy-MM-dd'),
      end: format(last, 'yyyy-MM-dd'),
    }
  }, [calendarDays])

  useEffect(() => {
    fetchAvailability()
  }, [dateRange, userId])

  async function fetchAvailability() {
    setLoading(true)

    // Fetch all availability for the visible date range
    const { data: all } = await supabase
      .from('availability')
      .select('*, profiles(id, full_name, avatar_url, username, handicap, location)')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)

    if (all) {
      setAllAvailability(all)
      if (userId) {
        setMyAvailability(all.filter(a => a.user_id === userId))
      }
    }
    setLoading(false)
  }

  // Get my status for a specific date
  function getMyStatus(date: Date): 'open' | 'closed' | null {
    const dateStr = format(date, 'yyyy-MM-dd')
    const entry = myAvailability.find(a => a.date === dateStr)
    return entry?.status ?? null
  }

  // Get my note for a specific date
  function getMyNote(date: Date): string | null {
    const dateStr = format(date, 'yyyy-MM-dd')
    const entry = myAvailability.find(a => a.date === dateStr)
    return entry?.note ?? null
  }

  // Count open players for a date (excluding self)
  function getOpenCount(date: Date): number {
    const dateStr = format(date, 'yyyy-MM-dd')
    return allAvailability.filter(
      a => a.date === dateStr && a.status === 'open' && a.user_id !== userId
    ).length
  }

  // Get all open players for a date
  function getOpenPlayers(date: Date): AvailabilityEntry[] {
    const dateStr = format(date, 'yyyy-MM-dd')
    return allAvailability.filter(
      a => a.date === dateStr && a.status === 'open'
    )
  }

  // Toggle availability: null → open → closed → null
  async function toggleDate(date: Date) {
    if (!userId || toggling) return
    // Don't allow toggling past dates (except today)
    if (isPast(date) && !isToday(date)) return

    setToggling(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    const current = getMyStatus(date)

    if (current === null) {
      // Set to open
      const { data } = await supabase
        .from('availability')
        .insert({ user_id: userId, date: dateStr, status: 'open' })
        .select('*, profiles(id, full_name, avatar_url, username, handicap, location)')
        .single()
      if (data) {
        setMyAvailability(prev => [...prev, data])
        setAllAvailability(prev => [...prev, data])
      }
    } else if (current === 'open') {
      // Switch to closed
      await supabase
        .from('availability')
        .update({ status: 'closed', note: null })
        .eq('user_id', userId)
        .eq('date', dateStr)
      setMyAvailability(prev =>
        prev.map(a => a.date === dateStr ? { ...a, status: 'closed' as const, note: null } : a)
      )
      setAllAvailability(prev =>
        prev.map(a => a.date === dateStr && a.user_id === userId ? { ...a, status: 'closed' as const, note: null } : a)
      )
    } else {
      // Remove entry
      await supabase
        .from('availability')
        .delete()
        .eq('user_id', userId)
        .eq('date', dateStr)
      setMyAvailability(prev => prev.filter(a => a.date !== dateStr))
      setAllAvailability(prev => prev.filter(a => !(a.date === dateStr && a.user_id === userId)))
    }

    setToggling(false)
  }

  // Save note for a date
  async function saveNote() {
    if (!userId || !noteDate) return
    const trimmed = noteText.trim()
    await supabase
      .from('availability')
      .update({ note: trimmed || null })
      .eq('user_id', userId)
      .eq('date', noteDate)

    setMyAvailability(prev =>
      prev.map(a => a.date === noteDate ? { ...a, note: trimmed || null } : a)
    )
    setAllAvailability(prev =>
      prev.map(a => a.date === noteDate && a.user_id === userId ? { ...a, note: trimmed || null } : a)
    )
    setNoteDate(null)
    setNoteText('')
  }

  const selectedOpenPlayers = selectedDate ? getOpenPlayers(selectedDate) : []
  const mySelectedStatus = selectedDate ? getMyStatus(selectedDate) : null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-white mb-1">Availability</h1>
        <p className="text-gray-400 mb-6">
          Tap dates to share when you&apos;re free. See when others want to play.
        </p>

        {/* Legend */}
        <div className="flex items-center gap-5 mb-5">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-4 h-4 rounded-md bg-emerald-500/30 border border-emerald-500/60 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
            Open
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-4 h-4 rounded-md bg-red-500/20 border border-red-500/50" />
            Closed
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-4 h-4 rounded-md bg-dark-700 border border-dark-600" />
            Not set
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 ml-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Others open
          </div>
        </div>

        {/* Calendar Card */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden mb-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
            <button
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-dark-700">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const inMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)
              const past = isPast(day) && !today
              const myStatus = getMyStatus(day)
              const openCount = getOpenCount(day)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
              const myNote = getMyNote(day)

              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedDate(prev => prev && isSameDay(prev, day) ? null : day)
                  }}
                  onDoubleClick={() => toggleDate(day)}
                  className={`relative aspect-square flex flex-col items-center justify-center gap-0.5 border-b border-r border-dark-700/50 transition-all
                    ${!inMonth ? 'opacity-30' : ''}
                    ${past ? 'opacity-50 cursor-default' : 'cursor-pointer'}
                    ${isSelected ? 'ring-2 ring-inset ring-emerald-400 bg-dark-700/50' : 'hover:bg-dark-700/30'}
                    ${myStatus === 'open' ? 'bg-emerald-500/10' : ''}
                    ${myStatus === 'closed' ? 'bg-red-500/8' : ''}
                  `}
                >
                  {/* Day number */}
                  <span className={`text-sm font-medium leading-none
                    ${today ? 'text-emerald-400 font-bold' : ''}
                    ${!today && inMonth ? 'text-gray-200' : ''}
                    ${!inMonth ? 'text-gray-600' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>

                  {/* Status indicator */}
                  {myStatus === 'open' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  )}
                  {myStatus === 'closed' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  )}

                  {/* Note indicator */}
                  {myNote && myStatus === 'open' && (
                    <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  )}

                  {/* Others open count */}
                  {openCount > 0 && inMonth && (
                    <span className="text-[10px] font-medium text-emerald-400/80 leading-none">
                      +{openCount}
                    </span>
                  )}

                  {/* Today ring */}
                  {today && (
                    <div className="absolute inset-1 rounded-lg border border-emerald-500/30 pointer-events-none" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick toggle for selected date */}
          {selectedDate && !isPast(selectedDate) && userId && (
            <div className="px-5 py-4 border-t border-dark-700 bg-dark-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mySelectedStatus === 'open' ? 'You\'re available' : mySelectedStatus === 'closed' ? 'You\'re busy' : 'Not set — mark your availability'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Open button */}
                  <button
                    onClick={async () => {
                      const dateStr = format(selectedDate, 'yyyy-MM-dd')
                      if (mySelectedStatus === 'open') {
                        // Remove
                        await supabase.from('availability').delete().eq('user_id', userId).eq('date', dateStr)
                        setMyAvailability(prev => prev.filter(a => a.date !== dateStr))
                        setAllAvailability(prev => prev.filter(a => !(a.date === dateStr && a.user_id === userId)))
                      } else if (mySelectedStatus === 'closed') {
                        // Update to open
                        await supabase.from('availability').update({ status: 'open' }).eq('user_id', userId).eq('date', dateStr)
                        setMyAvailability(prev => prev.map(a => a.date === dateStr ? { ...a, status: 'open' as const } : a))
                        setAllAvailability(prev => prev.map(a => a.date === dateStr && a.user_id === userId ? { ...a, status: 'open' as const } : a))
                      } else {
                        // Insert open
                        const { data } = await supabase
                          .from('availability')
                          .insert({ user_id: userId, date: dateStr, status: 'open' })
                          .select('*, profiles(id, full_name, avatar_url, username, handicap, location)')
                          .single()
                        if (data) {
                          setMyAvailability(prev => [...prev, data])
                          setAllAvailability(prev => [...prev, data])
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      mySelectedStatus === 'open'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                        : 'bg-dark-700 text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/30 border border-dark-600'
                    }`}
                  >
                    Open
                  </button>
                  {/* Closed button */}
                  <button
                    onClick={async () => {
                      const dateStr = format(selectedDate, 'yyyy-MM-dd')
                      if (mySelectedStatus === 'closed') {
                        // Remove
                        await supabase.from('availability').delete().eq('user_id', userId).eq('date', dateStr)
                        setMyAvailability(prev => prev.filter(a => a.date !== dateStr))
                        setAllAvailability(prev => prev.filter(a => !(a.date === dateStr && a.user_id === userId)))
                      } else if (mySelectedStatus === 'open') {
                        // Update to closed
                        await supabase.from('availability').update({ status: 'closed', note: null }).eq('user_id', userId).eq('date', dateStr)
                        setMyAvailability(prev => prev.map(a => a.date === dateStr ? { ...a, status: 'closed' as const, note: null } : a))
                        setAllAvailability(prev => prev.map(a => a.date === dateStr && a.user_id === userId ? { ...a, status: 'closed' as const, note: null } : a))
                      } else {
                        // Insert closed
                        const { data } = await supabase
                          .from('availability')
                          .insert({ user_id: userId, date: dateStr, status: 'closed' })
                          .select('*, profiles(id, full_name, avatar_url, username, handicap, location)')
                          .single()
                        if (data) {
                          setMyAvailability(prev => [...prev, data])
                          setAllAvailability(prev => [...prev, data])
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      mySelectedStatus === 'closed'
                        ? 'bg-red-500/80 text-white'
                        : 'bg-dark-700 text-gray-400 hover:text-red-400 hover:bg-red-900/20 border border-dark-600'
                    }`}
                  >
                    Closed
                  </button>
                  {/* Add note (only if open) */}
                  {mySelectedStatus === 'open' && (
                    <button
                      onClick={() => {
                        setNoteDate(format(selectedDate, 'yyyy-MM-dd'))
                        setNoteText(getMyNote(selectedDate) || '')
                      }}
                      className="px-3 py-2 rounded-xl text-sm font-medium text-gray-400 bg-dark-700 border border-dark-600 hover:text-white hover:bg-dark-600 transition-colors"
                    >
                      {getMyNote(selectedDate) ? 'Edit Note' : '+ Note'}
                    </button>
                  )}
                </div>
              </div>
              {/* Show note inline */}
              {mySelectedStatus === 'open' && getMyNote(selectedDate) && (
                <p className="mt-2 text-xs text-emerald-300/70 bg-emerald-900/20 rounded-lg px-3 py-2 border border-emerald-800/30">
                  {getMyNote(selectedDate)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Who's Available Panel */}
        {selectedDate && (
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-dark-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedOpenPlayers.length === 0
                      ? 'No one has marked this day yet'
                      : `${selectedOpenPlayers.length} player${selectedOpenPlayers.length !== 1 ? 's' : ''} available`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedOpenPlayers.length > 0 ? (
              <div className="divide-y divide-dark-700">
                {selectedOpenPlayers.map(entry => {
                  const isMe = entry.user_id === userId
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-900/50 border-2 border-emerald-800/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {entry.profiles?.avatar_url ? (
                          <img src={entry.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-emerald-400 font-semibold text-sm">
                            {entry.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {entry.profiles?.full_name || 'Unknown'}
                          {isMe && <span className="ml-1.5 text-emerald-400 text-xs">(you)</span>}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {entry.profiles?.handicap != null && (
                            <span className="inline-flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              {entry.profiles.handicap} hdcp
                            </span>
                          )}
                          {entry.profiles?.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.profiles.location}
                            </span>
                          )}
                        </div>
                        {entry.note && (
                          <p className="text-xs text-emerald-300/60 mt-1">{entry.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                        <span className="text-xs font-medium text-emerald-400">Open</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-sm text-gray-500">
                  {isPast(selectedDate) && !isToday(selectedDate)
                    ? 'This date has passed'
                    : 'Be the first to mark this day as open!'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Upcoming availability summary */}
        {!selectedDate && (
          <UpcomingAvailability
            allAvailability={allAvailability}
            userId={userId}
            onSelectDate={(d) => {
              setSelectedDate(d)
              // Ensure month is visible
              if (!isSameMonth(d, currentMonth)) {
                setCurrentMonth(startOfMonth(d))
              }
            }}
          />
        )}

        {/* Note Modal */}
        {noteDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNoteDate(null)} />
            <div className="relative bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl w-full max-w-sm p-5">
              <h3 className="text-base font-semibold text-white mb-3">Add a note</h3>
              <p className="text-xs text-gray-500 mb-3">Let others know your preferences (e.g. &quot;Morning only&quot;, &quot;Walking round&quot;)</p>
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Morning preferred, flexible on course..."
                className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none mb-4"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveNote() }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setNoteDate(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-dark-700 hover:bg-dark-600 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNote}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-component: shows upcoming days where players are available
function UpcomingAvailability({
  allAvailability,
  userId,
  onSelectDate,
}: {
  allAvailability: AvailabilityEntry[]
  userId: string | null
  onSelectDate: (d: Date) => void
}) {
  // Group by date, only future open entries
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const upcomingByDate = useMemo(() => {
    const map = new Map<string, AvailabilityEntry[]>()
    for (const entry of allAvailability) {
      if (entry.status !== 'open') continue
      if (entry.date < todayStr) continue
      const existing = map.get(entry.date) || []
      existing.push(entry)
      map.set(entry.date, existing)
    }
    // Sort by date
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 7)
  }, [allAvailability, todayStr])

  if (upcomingByDate.length === 0) {
    return (
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8 text-center">
        <div className="w-14 h-14 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-white mb-2">No upcoming availability yet</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Tap dates on the calendar above to mark when you&apos;re free to play. Others will see your availability!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-700">
        <h3 className="text-base font-semibold text-white">Upcoming Availability</h3>
        <p className="text-xs text-gray-500 mt-0.5">Days where players are looking to play</p>
      </div>
      <div className="divide-y divide-dark-700">
        {upcomingByDate.map(([dateStr, entries]) => {
          const date = new Date(dateStr + 'T12:00:00')
          const isMe = entries.some(e => e.user_id === userId)

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-dark-700/50 transition-colors text-left"
            >
              {/* Date block */}
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                isMe ? 'bg-emerald-900/40 border border-emerald-800/50' : 'bg-dark-700 border border-dark-600'
              }`}>
                <span className="text-[10px] font-medium text-gray-500 uppercase leading-none">
                  {format(date, 'EEE')}
                </span>
                <span className={`text-lg font-bold leading-tight ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                  {format(date, 'd')}
                </span>
              </div>

              {/* Player avatars */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {format(date, 'EEEE, MMM d')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex -space-x-2">
                    {entries.slice(0, 5).map(e => (
                      <div
                        key={e.id}
                        className="w-6 h-6 rounded-full border-2 border-dark-800 bg-emerald-900/50 flex items-center justify-center overflow-hidden"
                        title={e.profiles?.full_name || 'Player'}
                      >
                        {e.profiles?.avatar_url ? (
                          <img src={e.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-emerald-400 text-[9px] font-bold">
                            {e.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {entries.length} player{entries.length !== 1 ? 's' : ''}
                    {isMe && ' (including you)'}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
