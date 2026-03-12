'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  Plus,
  UserPlus,
  UserMinus,
  MessageCircle,
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
  parseISO,
} from 'date-fns'
import type { Meetup } from '@/lib/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { userId } = useUser()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })
  }, [currentMonth])

  const dateRange = useMemo(() => ({
    start: calendarDays[0].toISOString(),
    end: new Date(calendarDays[calendarDays.length - 1].getTime() + 86400000).toISOString(),
  }), [calendarDays])

  useEffect(() => {
    fetchMeetups()
  }, [dateRange])

  async function fetchMeetups() {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetups')
      .select('*, courses(*), profiles!meetups_organizer_id_fkey(*), meetup_attendees(*, profiles(*))')
      .gte('tee_time', dateRange.start)
      .lte('tee_time', dateRange.end)
      .order('tee_time', { ascending: true })

    if (!error && data) setMeetups(data)
    setLoading(false)
  }

  // Group meetups by date string
  const meetupsByDate = useMemo(() => {
    const map = new Map<string, Meetup[]>()
    for (const m of meetups) {
      const dateStr = format(parseISO(m.tee_time), 'yyyy-MM-dd')
      const arr = map.get(dateStr) || []
      arr.push(m)
      map.set(dateStr, arr)
    }
    return map
  }, [meetups])

  function getMeetupsForDate(date: Date): Meetup[] {
    return meetupsByDate.get(format(date, 'yyyy-MM-dd')) || []
  }

  function getPlayerCount(meetup: Meetup): number {
    return 1 + (meetup.meetup_attendees?.length || 0)
  }

  function getSpotsLeft(meetup: Meetup): number {
    return meetup.max_players - getPlayerCount(meetup)
  }

  function isUserInMeetup(meetup: Meetup): boolean {
    if (!userId) return false
    if (meetup.organizer_id === userId) return true
    return meetup.meetup_attendees?.some(a => a.user_id === userId) || false
  }

  async function joinMeetup(meetupId: string) {
    if (!userId || joining) return
    setJoining(meetupId)
    await supabase.from('meetup_attendees').insert({ meetup_id: meetupId, user_id: userId })
    await fetchMeetups()
    setJoining(null)
  }

  async function leaveMeetup(meetupId: string) {
    if (!userId || joining) return
    setJoining(meetupId)
    await supabase.from('meetup_attendees').delete().eq('meetup_id', meetupId).eq('user_id', userId)
    await fetchMeetups()
    setJoining(null)
  }

  const selectedMeetups = selectedDate ? getMeetupsForDate(selectedDate) : []

  // Upcoming tee times (next ones from today)
  const upcoming = useMemo(() => {
    const now = new Date()
    return meetups.filter(m => parseISO(m.tee_time) >= now).slice(0, 8)
  }, [meetups])

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Tee Sheet</h1>
            <p className="text-gray-400 text-sm mt-1">Browse tee times. Tap a date to see who&apos;s playing.</p>
          </div>
          {userId && (
            <a
              href="/tee-times"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post a Time
            </a>
          )}
        </div>

        {/* Calendar Card */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden mb-6">
          {/* Month Nav */}
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
              const dayMeetups = getMeetupsForDate(day)
              const count = dayMeetups.length
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
              const hasMyTime = dayMeetups.some(m => isUserInMeetup(m))
              const hasOpenSpots = dayMeetups.some(m => getSpotsLeft(m) > 0)

              // Glow intensity based on tee time count
              const glowBg = count === 0 ? '' :
                hasMyTime ? 'bg-emerald-500/15' :
                count >= 3 ? 'bg-emerald-400/20' :
                count >= 2 ? 'bg-emerald-400/12' :
                'bg-emerald-400/8'

              const glowShadow = count === 0 || past ? '' :
                count >= 3 ? 'shadow-[inset_0_0_20px_rgba(52,211,153,0.25)]' :
                count >= 2 ? 'shadow-[inset_0_0_14px_rgba(52,211,153,0.18)]' :
                'shadow-[inset_0_0_10px_rgba(52,211,153,0.12)]'

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(prev => prev && isSameDay(prev, day) ? null : day)}
                  className={`relative aspect-square flex flex-col items-center justify-center gap-1 border-b border-r border-dark-700/50 transition-all
                    ${!inMonth ? 'opacity-25' : ''}
                    ${past ? 'opacity-40' : 'cursor-pointer'}
                    ${isSelected ? 'ring-2 ring-inset ring-emerald-400 bg-emerald-500/20' : count > 0 && inMonth ? `${glowBg} ${glowShadow} hover:brightness-125` : 'hover:bg-dark-700/30'}
                  `}
                >
                  {/* Animated pulse ring for dates with open spots */}
                  {count > 0 && hasOpenSpots && inMonth && !past && !isSelected && (
                    <div className="absolute inset-1.5 rounded-lg border border-emerald-400/30 animate-pulse pointer-events-none" />
                  )}

                  <span className={`text-sm font-medium leading-none relative z-10
                    ${today && count === 0 ? 'text-emerald-400 font-bold' : ''}
                    ${today && count > 0 ? 'text-white font-bold' : ''}
                    ${!today && count > 0 && inMonth ? 'text-white font-semibold' : ''}
                    ${!today && count === 0 && inMonth ? 'text-gray-200' : ''}
                    ${!inMonth ? 'text-gray-600' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>

                  {/* Tee time count badge */}
                  {count > 0 && inMonth && (
                    <span className={`text-[10px] font-bold leading-none relative z-10 ${
                      hasMyTime ? 'text-emerald-300' :
                      count >= 3 ? 'text-emerald-300' :
                      'text-emerald-400/80'
                    }`}>
                      {count} {count === 1 ? 'time' : 'times'}
                    </span>
                  )}

                  {/* Your tee time indicator */}
                  {hasMyTime && inMonth && (
                    <div className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] z-10" />
                  )}

                  {today && (
                    <div className="absolute inset-1 rounded-lg border border-emerald-500/40 pointer-events-none z-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Date Detail */}
        {selectedDate && (
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedMeetups.length === 0
                    ? 'No tee times posted yet'
                    : `${selectedMeetups.length} tee time${selectedMeetups.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-500 hover:text-white p-1"
              >
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            </div>

            {selectedMeetups.length > 0 ? (
              <div className="divide-y divide-dark-700">
                {selectedMeetups.map(meetup => (
                  <MeetupRow
                    key={meetup.id}
                    meetup={meetup}
                    userId={userId}
                    joining={joining === meetup.id}
                    isUserIn={isUserInMeetup(meetup)}
                    spotsLeft={getSpotsLeft(meetup)}
                    playerCount={getPlayerCount(meetup)}
                    onJoin={() => joinMeetup(meetup.id)}
                    onLeave={() => leaveMeetup(meetup.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 mb-3">No one has posted a tee time for this day.</p>
                {userId && !isPast(selectedDate) && (
                  <a
                    href="/tee-times"
                    className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    <Plus className="w-4 h-4" />
                    Be the first — post a tee time
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Tee Times */}
        {!selectedDate && (
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-dark-700">
              <h3 className="text-base font-semibold text-white">Upcoming Tee Times</h3>
              <p className="text-xs text-gray-500 mt-0.5">Jump into a round</p>
            </div>

            {loading ? (
              <div className="p-5 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-dark-700 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : upcoming.length > 0 ? (
              <div className="divide-y divide-dark-700">
                {upcoming.map(meetup => (
                  <MeetupRow
                    key={meetup.id}
                    meetup={meetup}
                    userId={userId}
                    joining={joining === meetup.id}
                    isUserIn={isUserInMeetup(meetup)}
                    spotsLeft={getSpotsLeft(meetup)}
                    playerCount={getPlayerCount(meetup)}
                    onJoin={() => joinMeetup(meetup.id)}
                    onLeave={() => leaveMeetup(meetup.id)}
                    showDate
                  />
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="w-14 h-14 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">No upcoming tee times</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                  Post a tee time and others can join your group.
                </p>
                {userId && (
                  <a
                    href="/tee-times"
                    className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Post a Tee Time
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MeetupRow({
  meetup,
  userId,
  joining,
  isUserIn,
  spotsLeft,
  playerCount,
  onJoin,
  onLeave,
  showDate,
}: {
  meetup: Meetup
  userId: string | null
  joining: boolean
  isUserIn: boolean
  spotsLeft: number
  playerCount: number
  onJoin: () => void
  onLeave: () => void
  showDate?: boolean
}) {
  const teeTime = parseISO(meetup.tee_time)
  const course = meetup.courses
  const organizer = meetup.profiles
  const isOrganizer = userId === meetup.organizer_id
  const full = spotsLeft <= 0

  return (
    <div className={`px-5 py-4 ${isUserIn ? 'bg-emerald-500/5' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Time block */}
        <div className="flex-shrink-0 text-center w-14">
          {showDate && (
            <p className="text-[10px] font-medium text-gray-500 uppercase mb-0.5">
              {format(teeTime, 'EEE, MMM d')}
            </p>
          )}
          <p className="text-lg font-bold text-white leading-tight">
            {format(teeTime, 'h:mm')}
          </p>
          <p className="text-xs text-gray-500">{format(teeTime, 'a')}</p>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{meetup.title}</p>
          {course && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {course.parent_club ? `${course.parent_club} – ` : ''}
                {course.name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            {/* Player avatars */}
            <div className="flex -space-x-2">
              {/* Organizer */}
              <div
                className="w-6 h-6 rounded-full border-2 border-dark-800 bg-emerald-900/50 flex items-center justify-center overflow-hidden"
                title={organizer?.full_name || 'Organizer'}
              >
                {organizer?.avatar_url ? (
                  <img src={organizer.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-emerald-400 text-[9px] font-bold">
                    {organizer?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              {/* Attendees */}
              {meetup.meetup_attendees?.slice(0, 4).map(att => (
                <div
                  key={att.id}
                  className="w-6 h-6 rounded-full border-2 border-dark-800 bg-dark-600 flex items-center justify-center overflow-hidden"
                  title={att.profiles?.full_name || 'Player'}
                >
                  {att.profiles?.avatar_url ? (
                    <img src={att.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-[9px] font-bold">
                      {att.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              {playerCount}/{meetup.max_players} players
            </span>
            {spotsLeft > 0 && !isUserIn && (
              <span className="text-xs font-medium text-emerald-400">
                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open
              </span>
            )}
            {full && !isUserIn && (
              <span className="text-xs font-medium text-gray-500">Full</span>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {isUserIn && (
            <a
              href={`/tee-times/${meetup.id}`}
              className="p-2 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-900/20 transition-colors"
              title="Match Room"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
          {userId && !isOrganizer && isUserIn && (
            <button
              onClick={onLeave}
              disabled={joining}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-900/20 hover:bg-red-900/30 border border-red-800/30 transition-colors disabled:opacity-50"
            >
              <UserMinus className="w-3.5 h-3.5" />
              Leave
            </button>
          )}
          {userId && !isUserIn && !full && (
            <button
              onClick={onJoin}
              disabled={joining}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-800/30 transition-colors disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Join
            </button>
          )}
          {isOrganizer && (
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full">
              Yours
            </span>
          )}
          {!userId && (
            <a
              href="/signup"
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Sign up to join
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
