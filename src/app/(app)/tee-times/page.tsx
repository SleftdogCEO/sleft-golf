'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Plus,
  MapPin,
  Clock,
  Users,
  Calendar,
  Check,
  X,
  MessageCircle,
  ChevronRight,
  ArrowRight,
  Award,
  Search,
} from 'lucide-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { WeatherWidget } from '@/components/weather-widget'
import { useUser } from '@/hooks/use-user'

type MeetupAttendee = {
  id: string
  meetup_id: string
  user_id: string
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

type MeetupCourse = {
  id: string
  name: string
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
  parent_club: string | null
}

type Meetup = {
  id: string
  title: string
  description: string | null
  course_id: string | null
  tee_time: string
  max_players: number
  organizer_id: string
  created_at: string
  profiles?: {
    id: string
    full_name: string
    avatar_url: string | null
    username: string
    handicap: number | null
    location: string | null
  }
  courses?: MeetupCourse
  meetup_attendees?: MeetupAttendee[]
}

type CourseOption = {
  id: string
  name: string
  city: string | null
  state: string | null
  parent_club: string | null
}

type Filter = 'open' | 'my_times' | 'past'

export default function TeeTimesPage() {
  const supabase = createClient()
  const { userId, profile } = useUser()

  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [user, setUser] = useState<{ id: string; full_name: string; avatar_url: string | null } | null>(null)
  const [filter, setFilter] = useState<Filter>('open')
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [joining, setJoining] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Create form state
  const [formTitle, setFormTitle] = useState('')
  const [formClub, setFormClub] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formDateTime, setFormDateTime] = useState('')
  const [formMaxPlayers, setFormMaxPlayers] = useState(4)
  const [formDescription, setFormDescription] = useState('')

  useEffect(() => {
    fetchMeetups()
    fetchCourses()
  }, [])

  useEffect(() => {
    if (profile) {
      setUser({ id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url })
    }
  }, [profile])

  async function fetchMeetups() {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetups')
      .select('*, profiles(id, full_name, avatar_url, username, handicap, location), courses(*), meetup_attendees(*, profiles(id, full_name, avatar_url, username, handicap, location))')
      .order('tee_time', { ascending: true })

    if (error) {
      console.error('Error fetching tee times:', error)
    } else {
      setMeetups(data || [])
    }
    setLoading(false)
  }

  async function fetchCourses() {
    const { data } = await supabase
      .from('courses')
      .select('id, name, city, state, parent_club')
      .order('name', { ascending: true })

    if (data) setCourses(data)
  }

  async function handleJoin(meetupId: string) {
    if (!user) return
    setJoining(meetupId)

    const { error } = await supabase
      .from('meetup_attendees')
      .insert({ meetup_id: meetupId, user_id: user.id })

    if (!error) {
      await fetchMeetups()
    }
    setJoining(null)
  }

  async function handleLeave(meetupId: string) {
    if (!user) return
    setJoining(meetupId)

    const { error } = await supabase
      .from('meetup_attendees')
      .delete()
      .eq('meetup_id', meetupId)
      .eq('user_id', user.id)

    if (!error) {
      await fetchMeetups()
    }
    setJoining(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !formTitle.trim() || !formDateTime) return

    setSubmitting(true)

    const { data: newMeetup, error } = await supabase
      .from('meetups')
      .insert({
        title: formTitle.trim(),
        course_id: formCourseId || null,
        tee_time: new Date(formDateTime).toISOString(),
        max_players: formMaxPlayers,
        description: [formClub && !formCourseId ? `Club: ${formClub}` : '', formDescription.trim()].filter(Boolean).join('\n') || null,
        organizer_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tee time:', error)
      setSubmitting(false)
      return
    }

    if (newMeetup) {
      await supabase
        .from('meetup_attendees')
        .insert({ meetup_id: newMeetup.id, user_id: user.id })
    }

    setFormTitle('')
    setFormClub('')
    setFormCourseId('')
    setFormDateTime('')
    setFormMaxPlayers(4)
    setFormDescription('')
    setShowCreate(false)
    setSubmitting(false)
    await fetchMeetups()
  }

  function isUserAttending(meetup: Meetup) {
    if (!user) return false
    return meetup.meetup_attendees?.some(a => a.user_id === user.id) ?? false
  }

  function getStatus(meetup: Meetup): 'open' | 'full' | 'past' {
    if (isPast(new Date(meetup.tee_time))) return 'past'
    const attendeeCount = meetup.meetup_attendees?.length ?? 0
    if (attendeeCount >= meetup.max_players) return 'full'
    return 'open'
  }

  function getHandicapLabel(handicap: number | null | undefined): string {
    if (handicap == null) return 'Any level'
    if (handicap <= 5) return 'Scratch'
    if (handicap <= 12) return 'Low'
    if (handicap <= 20) return 'Mid'
    return 'High'
  }

  const filteredMeetups = meetups.filter(meetup => {
    const teeTime = new Date(meetup.tee_time)
    const status = getStatus(meetup)

    // Filter by tab
    switch (filter) {
      case 'open':
        if (isPast(teeTime) || status === 'full') return false
        break
      case 'my_times':
        if (!user) return false
        if (meetup.organizer_id !== user.id && !isUserAttending(meetup)) return false
        break
      case 'past':
        if (!isPast(teeTime)) return false
        break
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesCourse = meetup.courses?.name?.toLowerCase().includes(q) ||
        meetup.courses?.city?.toLowerCase().includes(q) ||
        meetup.courses?.parent_club?.toLowerCase().includes(q)
      const matchesTitle = meetup.title.toLowerCase().includes(q)
      const matchesOrganizer = meetup.profiles?.full_name?.toLowerCase().includes(q)
      if (!matchesCourse && !matchesTitle && !matchesOrganizer) return false
    }

    return true
  })

  const filterTabs: { key: Filter; label: string }[] = [
    { key: 'open', label: 'Open Rounds' },
    { key: 'my_times', label: 'My Tee Times' },
    { key: 'past', label: 'Past' },
  ]

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-white">Tee Times</h1>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" />
              Post a Tee Time
            </button>
          )}
        </div>
        <p className="text-gray-400 mb-6">
          Find open rounds near you. Join up with golfers at your level.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by course, city, or player..."
            className="w-full bg-dark-800 border border-dark-700 text-gray-100 placeholder-gray-500 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-dark-800 rounded-xl p-1 mb-6 border border-dark-700">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Tee Time Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreate(false)}
            />
            <div className="relative bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-dark-700">
                <h2 className="text-lg font-bold text-white">Post a Tee Time</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1.5 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder='e.g., "Looking for a 4th this Saturday"'
                    required
                    className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Course</label>
                  <input
                    type="text"
                    value={formClub}
                    onChange={e => setFormClub(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none mb-2"
                  />
                  {formClub.trim() && (
                    <div className="max-h-40 overflow-y-auto bg-dark-700 border border-dark-600 rounded-xl">
                      {courses
                        .filter(c => c.name.toLowerCase().includes(formClub.toLowerCase()) || c.parent_club?.toLowerCase().includes(formClub.toLowerCase()))
                        .slice(0, 6)
                        .map(course => (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => {
                              setFormCourseId(course.id)
                              setFormClub(course.parent_club ? `${course.parent_club} - ${course.name}` : course.name)
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-dark-600 last:border-b-0 ${
                              formCourseId === course.id
                                ? 'bg-emerald-900/40 text-emerald-300'
                                : 'text-gray-300 hover:bg-dark-600'
                            }`}
                          >
                            <span className="font-medium">{course.name}</span>
                            {course.parent_club && (
                              <span className="text-gray-500 text-xs ml-2">{course.parent_club}</span>
                            )}
                            {course.city && (
                              <span className="text-gray-500 text-xs ml-1">&middot; {course.city}, {course.state}</span>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Tee Time</label>
                  <input
                    type="datetime-local"
                    value={formDateTime}
                    onChange={e => setFormDateTime(e.target.value)}
                    required
                    className="w-full bg-dark-700 border border-dark-600 text-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Group Size</label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5, 6, 8].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFormMaxPlayers(n)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          formMaxPlayers === n
                            ? 'bg-emerald-600 text-white'
                            : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 border border-dark-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Notes <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Skill level, cart/walk, any details..."
                    rows={2}
                    className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 bg-dark-700 hover:bg-dark-600 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formTitle.trim() || !formDateTime}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Posting...' : 'Post Tee Time'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tee Time Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-dark-800 rounded-2xl border border-dark-700 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-dark-700" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-48 bg-dark-700 rounded" />
                    <div className="h-3 w-24 bg-dark-700 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-dark-700 rounded mb-2" />
                <div className="h-2 w-full bg-dark-700 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredMeetups.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {filter === 'open' && 'No open rounds right now'}
              {filter === 'my_times' && "You haven't joined any tee times yet"}
              {filter === 'past' && 'No past tee times'}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              {filter === 'open' && 'Be the first to post one! Looking for a playing partner is as easy as posting your tee time.'}
              {filter === 'my_times' && 'Browse open rounds and tap "I\'m In" to join one.'}
              {filter === 'past' && 'Past tee times will show up here.'}
            </p>
            {filter === 'open' && user && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-6 inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Post a Tee Time
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetups.map(meetup => {
              const status = getStatus(meetup)
              const attendeeCount = meetup.meetup_attendees?.length ?? 0
              const spotsLeft = meetup.max_players - attendeeCount
              const attending = isUserAttending(meetup)
              const isOrganizer = user?.id === meetup.organizer_id
              const organizerHandicap = meetup.profiles?.handicap

              return (
                <div
                  key={meetup.id}
                  className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden hover:border-dark-600 transition-colors"
                >
                  <div className="p-5">
                    {/* Top row: organizer info + spots left */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-emerald-800/50">
                          {meetup.profiles?.avatar_url ? (
                            <img src={meetup.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-emerald-400 font-semibold text-sm">
                              {meetup.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium text-sm truncate">
                            {meetup.profiles?.full_name || 'Unknown'}
                            {isOrganizer && <span className="ml-1.5 text-emerald-400 text-xs">(you)</span>}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {organizerHandicap != null && (
                              <span className="inline-flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                {organizerHandicap} hdcp
                              </span>
                            )}
                            {meetup.profiles?.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {meetup.profiles.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Spots badge */}
                      {status === 'open' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open
                        </span>
                      )}
                      {status === 'full' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-800/50">
                          Full
                        </span>
                      )}
                      {status === 'past' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-dark-700 text-gray-400 border border-dark-600">
                          Played
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-semibold text-base mb-3">{meetup.title}</h3>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
                      {meetup.courses && (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">
                            {meetup.courses.parent_club ? `${meetup.courses.parent_club} - ` : ''}
                            {meetup.courses.name}
                            {meetup.courses.city && <span className="text-gray-500"> &middot; {meetup.courses.city}, {meetup.courses.state}</span>}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{format(new Date(meetup.tee_time), 'EEE, MMM d')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{format(new Date(meetup.tee_time), 'h:mm a')}</span>
                      </div>
                    </div>

                    {/* Who's in */}
                    {attendeeCount > 0 && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex -space-x-2">
                          {meetup.meetup_attendees?.slice(0, 5).map(attendee => (
                            <div
                              key={attendee.id}
                              className="w-8 h-8 rounded-full border-2 border-dark-800 bg-dark-600 flex items-center justify-center overflow-hidden"
                              title={`${attendee.profiles?.full_name || 'Player'}${attendee.profiles?.handicap != null ? ` (${attendee.profiles.handicap} hdcp)` : ''}`}
                            >
                              {attendee.profiles?.avatar_url ? (
                                <img src={attendee.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-gray-300 text-xs font-medium">
                                  {attendee.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {meetup.meetup_attendees
                            ?.slice(0, 2)
                            .map(a => a.profiles?.full_name?.split(' ')[0])
                            .join(', ')}
                          {attendeeCount > 2 && ` +${attendeeCount - 2} more`}
                        </span>
                        {!isPast(new Date(meetup.tee_time)) && (
                          <span className="text-xs text-gray-600 ml-auto">
                            {formatDistanceToNow(new Date(meetup.tee_time), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    )}

                    {meetup.description && (
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{meetup.description}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {status !== 'past' && user && (
                        <>
                          {attending ? (
                            <button
                              onClick={() => handleLeave(meetup.id)}
                              disabled={joining === meetup.id}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-red-900/30 hover:text-red-400 border border-dark-600 hover:border-red-800/50 transition-colors disabled:opacity-50"
                            >
                              {joining === meetup.id ? (
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                              Leave
                            </button>
                          ) : status === 'open' ? (
                            <button
                              onClick={() => handleJoin(meetup.id)}
                              disabled={joining === meetup.id}
                              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-900/30 disabled:opacity-50"
                            >
                              {joining === meetup.id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              I&apos;m In
                            </button>
                          ) : null}
                        </>
                      )}

                      {attending && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          You&apos;re in
                        </span>
                      )}

                      <Link
                        href={`/tee-times/${meetup.id}`}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Match Room
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
