'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import {
  MapPin,
  Clock,
  Users,
  Plus,
  UserPlus,
  UserMinus,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  format,
  addDays,
  isSameDay,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { Meetup, Profile } from '@/lib/types'
import { hapticLight, hapticMedium } from '@/lib/haptics'

export default function CalendarPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { userId } = useUser()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [dateOffset, setDateOffset] = useState(0)

  // Generate 14 days from offset
  const dates = useMemo(() => {
    const base = addDays(new Date(), dateOffset)
    return Array.from({ length: 14 }, (_, i) => addDays(base, i))
  }, [dateOffset])

  // Fetch range
  const dateRange = useMemo(() => ({
    start: startOfDay(dates[0]).toISOString(),
    end: addDays(startOfDay(dates[dates.length - 1]), 1).toISOString(),
  }), [dates])

  useEffect(() => { fetchMeetups() }, [dateRange])

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

  const meetupsForSelected = useMemo(() => {
    return meetups.filter(m => isSameDay(parseISO(m.tee_time), selectedDate))
  }, [meetups, selectedDate])

  // Count meetups per date for the date strip
  const meetupCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of meetups) {
      const key = format(parseISO(m.tee_time), 'yyyy-MM-dd')
      map.set(key, (map.get(key) || 0) + 1)
    }
    return map
  }, [meetups])

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

  function getAllPlayers(meetup: Meetup): Profile[] {
    const players: Profile[] = []
    if (meetup.profiles) players.push(meetup.profiles)
    for (const a of meetup.meetup_attendees || []) {
      if (a.profiles) players.push(a.profiles)
    }
    return players
  }

  async function joinMeetup(meetupId: string) {
    if (!userId || joining) return
    hapticMedium()
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

  function getDayLabel(date: Date): string {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE')
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">The Board</h1>
            <p className="text-gray-500 text-sm">See who's playing. Jump in.</p>
          </div>
          {userId && (
            <Link
              href="/tee-times"
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post a Time
            </Link>
          )}
        </div>

        {/* Date Strip */}
        <div className="mb-5">
          <div className="flex items-center gap-2">
            {dateOffset > 0 && (
              <button
                onClick={() => { setDateOffset(Math.max(0, dateOffset - 7)); hapticLight() }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
              {dates.map(date => {
                const isActive = isSameDay(date, selectedDate)
                const count = meetupCounts.get(format(date, 'yyyy-MM-dd')) || 0
                const today = isToday(date)

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => { setSelectedDate(date); hapticLight() }}
                    className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl transition-all min-w-[52px] ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : today
                          ? 'bg-dark-700 text-emerald-400 border border-emerald-700/50'
                          : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                    }`}
                  >
                    <span className={`text-[10px] font-medium uppercase ${isActive ? 'text-emerald-100' : ''}`}>
                      {getDayLabel(date)}
                    </span>
                    <span className={`text-lg font-bold leading-tight ${isActive ? 'text-white' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    {count > 0 && (
                      <div className={`flex gap-0.5 mt-0.5 ${isActive ? '' : ''}`}>
                        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/70' : 'bg-emerald-500'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => { setDateOffset(dateOffset + 7); hapticLight() }}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-colors flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected day header */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-400">
            {isToday(selectedDate) ? 'Today' : isTomorrow(selectedDate) ? 'Tomorrow' : format(selectedDate, 'EEEE')},{' '}
            <span className="text-white">{format(selectedDate, 'MMMM d')}</span>
          </h2>
        </div>

        {/* Tee Time Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-dark-800 rounded-2xl border border-dark-700 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-dark-700" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-40 bg-dark-700 rounded" />
                    <div className="h-3 w-24 bg-dark-700 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-dark-700" />
                  <div className="w-8 h-8 rounded-full bg-dark-700" />
                </div>
              </div>
            ))}
          </div>
        ) : meetupsForSelected.length === 0 ? (
          <div className="bg-dark-800 rounded-2xl border border-dark-700 py-16 px-5 text-center">
            <div className="w-14 h-14 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-gray-600" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No tee times</h3>
            <p className="text-sm text-gray-500 mb-5">No one has posted a tee time for this day yet.</p>
            {userId && (
              <Link
                href="/tee-times"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Be the first
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {meetupsForSelected.map(meetup => {
              const teeTime = parseISO(meetup.tee_time)
              const course = meetup.courses
              const players = getAllPlayers(meetup)
              const spotsLeft = getSpotsLeft(meetup)
              const isOpen = spotsLeft > 0
              const isIn = isUserInMeetup(meetup)
              const isOrganizer = userId === meetup.organizer_id

              return (
                <div
                  key={meetup.id}
                  className={`bg-dark-800 rounded-2xl border overflow-hidden transition-colors ${
                    isIn ? 'border-emerald-700/50' : isOpen ? 'border-dark-600' : 'border-dark-700 opacity-60'
                  }`}
                >
                  <div className="p-5">
                    {/* Top row: time + course */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Time block */}
                      <div className="flex-shrink-0 bg-dark-700 rounded-xl px-3 py-2.5 text-center min-w-[60px]">
                        <p className="text-xl font-black text-white leading-none">{format(teeTime, 'h:mm')}</p>
                        <p className="text-[10px] font-medium text-gray-500 uppercase mt-0.5">{format(teeTime, 'a')}</p>
                      </div>

                      {/* Course + title */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate">{meetup.title}</h3>
                        {course && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="text-xs text-gray-400 truncate">
                              {course.parent_club ? `${course.parent_club} - ` : ''}{course.name}
                            </span>
                          </div>
                        )}
                        {isOpen && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span className="text-xs font-medium text-amber-400">
                              {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Join/Leave button */}
                      <div className="flex-shrink-0">
                        {isOrganizer && (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-900/30 px-2.5 py-1.5 rounded-full">
                            Yours
                          </span>
                        )}
                        {userId && !isOrganizer && isIn && (
                          <button
                            onClick={() => leaveMeetup(meetup.id)}
                            disabled={joining === meetup.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-900/20 border border-red-800/30 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            Leave
                          </button>
                        )}
                        {userId && !isIn && isOpen && (
                          <button
                            onClick={() => joinMeetup(meetup.id)}
                            disabled={joining === meetup.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Join
                          </button>
                        )}
                        {!userId && isOpen && (
                          <Link
                            href="/signup"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Join
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Players */}
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {players.map((player, idx) => (
                          <div
                            key={player.id}
                            className={`w-9 h-9 rounded-full border-2 border-dark-800 flex items-center justify-center overflow-hidden ${
                              idx === 0 ? 'bg-emerald-600/20' : 'bg-dark-700'
                            }`}
                            title={player.full_name || undefined}
                          >
                            {player.avatar_url ? (
                              <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className={`text-xs font-bold ${idx === 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                {player.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                        ))}
                        {/* Empty spots as dashed circles */}
                        {isOpen && Array.from({ length: Math.min(spotsLeft, 3) }).map((_, i) => (
                          <div key={`empty-${i}`} className="w-9 h-9 rounded-full border-2 border-dashed border-dark-600 flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 text-gray-600" />
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 truncate">
                          {players.map(p => p.full_name?.split(' ')[0]).join(', ')}
                          {isOpen ? ` + ${spotsLeft} open` : ''}
                        </p>
                        {players.some(p => p.handicap != null) && (
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            Handicaps: {players.filter(p => p.handicap != null).map(p => p.handicap).join(', ')}
                          </p>
                        )}
                      </div>

                      {isIn && (
                        <Link
                          href={`/tee-times/${meetup.id}`}
                          className="p-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-900/20 transition-colors"
                          title="Match Room"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
