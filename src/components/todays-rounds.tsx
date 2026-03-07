'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, Users, ChevronRight, Flame } from 'lucide-react'
import { format, isToday, isTomorrow, isPast } from 'date-fns'

type TodayMeetup = {
  id: string
  title: string
  tee_time: string
  max_players: number
  organizer_id: string
  profiles?: { full_name: string; avatar_url: string | null }
  courses?: { name: string; parent_club: string | null; city: string | null }
  meetup_attendees?: { id: string; user_id: string; profiles?: { full_name: string; avatar_url: string | null } }[]
}

export function TodaysRounds() {
  const supabase = createClient()
  const [meetups, setMeetups] = useState<TodayMeetup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString()

      const { data } = await supabase
        .from('meetups')
        .select('*, profiles(full_name, avatar_url), courses(name, parent_club, city), meetup_attendees(id, user_id, profiles(full_name, avatar_url))')
        .gte('tee_time', startOfToday)
        .lte('tee_time', endOfTomorrow)
        .order('tee_time', { ascending: true })

      if (data) setMeetups(data)
      setLoading(false)
    }
    fetch()
  }, [supabase])

  if (loading) {
    return (
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5 animate-pulse">
        <div className="h-5 w-40 bg-dark-700 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-dark-700 rounded-xl" />
          <div className="h-16 bg-dark-700 rounded-xl" />
        </div>
      </div>
    )
  }

  if (meetups.length === 0) return null

  const todayMeetups = meetups.filter(m => isToday(new Date(m.tee_time)))
  const tomorrowMeetups = meetups.filter(m => isTomorrow(new Date(m.tee_time)))

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-700 flex items-center gap-2">
        <Flame className="w-5 h-5 text-amber-400" />
        <h2 className="text-white font-bold">
          {todayMeetups.length > 0 ? 'Today on the Course' : 'Upcoming Tee Times'}
        </h2>
      </div>

      <div className="divide-y divide-dark-700">
        {todayMeetups.length > 0 && todayMeetups.map(meetup => (
          <MeetupRow key={meetup.id} meetup={meetup} label="today" />
        ))}
        {tomorrowMeetups.length > 0 && (
          <>
            <div className="px-5 py-2 bg-dark-900/50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tomorrow</p>
            </div>
            {tomorrowMeetups.map(meetup => (
              <MeetupRow key={meetup.id} meetup={meetup} label="tomorrow" />
            ))}
          </>
        )}
      </div>

      <Link
        href="/meetups"
        className="flex items-center justify-center gap-2 px-5 py-3 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-dark-700 font-medium transition-colors border-t border-dark-700"
      >
        View all meetups
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

function MeetupRow({ meetup, label }: { meetup: TodayMeetup; label: string }) {
  const teeTime = new Date(meetup.tee_time)
  const isLive = isPast(teeTime) && (Date.now() - teeTime.getTime()) < 5 * 60 * 60 * 1000 // within 5 hrs
  const attendees = meetup.meetup_attendees || []
  const spotsLeft = meetup.max_players - attendees.length

  return (
    <Link
      href={`/meetups/${meetup.id}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-dark-700/50 transition-colors group"
    >
      {/* Time block */}
      <div className="text-center w-14 flex-shrink-0">
        <p className={`text-lg font-bold ${isLive ? 'text-emerald-400' : 'text-white'}`}>
          {format(teeTime, 'h:mm')}
        </p>
        <p className="text-xs text-gray-500 uppercase">{format(teeTime, 'a')}</p>
        {isLive && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate group-hover:text-emerald-300 transition-colors">
          {meetup.title}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {meetup.courses && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-emerald-400" />
              {meetup.courses.parent_club ? `${meetup.courses.parent_club} - ` : ''}
              {meetup.courses.name}
            </span>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex -space-x-2">
          {attendees.slice(0, 3).map(a => (
            <div
              key={a.id}
              className="w-7 h-7 rounded-full border-2 border-dark-800 bg-dark-600 flex items-center justify-center overflow-hidden"
              title={a.profiles?.full_name}
            >
              {a.profiles?.avatar_url ? (
                <img src={a.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-[10px] font-semibold">
                  {a.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          ))}
        </div>
        {spotsLeft > 0 ? (
          <span className="text-xs text-emerald-400 font-medium">
            {spotsLeft} open
          </span>
        ) : (
          <span className="text-xs text-gray-500 font-medium">Full</span>
        )}
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" />
      </div>
    </Link>
  )
}
