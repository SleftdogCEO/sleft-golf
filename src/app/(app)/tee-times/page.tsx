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
  ArrowRight,
  Award,
  Search,
  Hand,
  Pencil,
  Trash2,
} from 'lucide-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
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
  price_tier: number | null
  green_fee_estimate: number | null
  is_private: boolean
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
  price_tier: number | null
  green_fee_estimate: number | null
  is_private: boolean
}

type Filter = 'open' | 'my_times' | 'past'
type CreateMode = 'looking' | 'specific'

export default function TeeTimesPage() {
  const supabase = createClient()
  const { userId, profile } = useUser()

  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>('looking')
  const [user, setUser] = useState<{ id: string; full_name: string; avatar_url: string | null; handicap: number | null; location: string | null } | null>(null)
  const [filter, setFilter] = useState<Filter>('open')
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [joining, setJoining] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editMeetup, setEditMeetup] = useState<Meetup | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDateTime, setEditDateTime] = useState('')
  const [editMaxPlayers, setEditMaxPlayers] = useState(4)
  const [editCourseId, setEditCourseId] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Looking to Play form
  const [ltpDay, setLtpDay] = useState('')
  const [ltpTime, setLtpTime] = useState<'morning' | 'afternoon' | 'anytime'>('morning')
  const [ltpArea, setLtpArea] = useState('')
  const [ltpNotes, setLtpNotes] = useState('')
  const [ltpPlayers, setLtpPlayers] = useState(4)

  // Specific Tee Time form
  const [formTitle, setFormTitle] = useState('')
  const [formClub, setFormClub] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formDateTime, setFormDateTime] = useState('')
  const [formMaxPlayers, setFormMaxPlayers] = useState(4)
  const [formDescription, setFormDescription] = useState('')

  // Add Course form
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseClub, setNewCourseClub] = useState('')
  const [newCourseCity, setNewCourseCity] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)

  useEffect(() => {
    fetchMeetups()
    fetchCourses()
  }, [])

  useEffect(() => {
    if (profile) {
      setUser({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        handicap: profile.handicap,
        location: profile.location,
      })
      if (profile.location && !ltpArea) setLtpArea(profile.location)
    }
  }, [profile])

  async function fetchMeetups() {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetups')
      .select('*, profiles(id, full_name, avatar_url, username, handicap, location), courses(*), meetup_attendees(*, profiles(id, full_name, avatar_url, username, handicap, location))')
      .order('tee_time', { ascending: true })

    if (!error) setMeetups(data || [])
    setLoading(false)
  }

  async function fetchCourses() {
    const { data } = await supabase
      .from('courses')
      .select('id, name, city, state, parent_club, price_tier, green_fee_estimate, is_private')
      .order('name', { ascending: true })
    if (data) setCourses(data)
  }

  async function handleAddCourse() {
    if (!newCourseName.trim() || !newCourseCity.trim()) return
    setAddingCourse(true)

    const { data, error } = await supabase
      .from('courses')
      .insert({
        name: newCourseName.trim(),
        parent_club: newCourseClub.trim() || null,
        city: newCourseCity.trim(),
        state: 'FL',
        holes: 18,
        par: 72,
      })
      .select('id, name, city, state, parent_club, price_tier, green_fee_estimate, is_private')
      .single()

    if (data && !error) {
      setCourses(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setFormCourseId(data.id)
      setFormClub(data.parent_club ? `${data.parent_club} - ${data.name}` : data.name)
      setShowAddCourse(false)
      setNewCourseName('')
      setNewCourseClub('')
      setNewCourseCity('')
    }
    setAddingCourse(false)
  }

  async function handleJoin(meetupId: string) {
    if (!user) return
    setJoining(meetupId)
    await supabase.from('meetup_attendees').insert({ meetup_id: meetupId, user_id: user.id })
    await fetchMeetups()
    setJoining(null)
  }

  async function handleLeave(meetupId: string) {
    if (!user) return
    setJoining(meetupId)
    await supabase.from('meetup_attendees').delete().eq('meetup_id', meetupId).eq('user_id', user.id)
    await fetchMeetups()
    setJoining(null)
  }

  async function handleDelete(meetupId: string) {
    setDeleting(true)
    await supabase.from('meetups').delete().eq('id', meetupId)
    setDeleteId(null)
    setDeleting(false)
    await fetchMeetups()
  }

  function openEdit(meetup: Meetup) {
    setEditMeetup(meetup)
    setEditTitle(meetup.title)
    setEditDateTime(format(new Date(meetup.tee_time), "yyyy-MM-dd'T'HH:mm"))
    setEditMaxPlayers(meetup.max_players)
    setEditCourseId(meetup.course_id || '')
    setEditDescription(meetup.description || '')
  }

  async function handleEditSave() {
    if (!editMeetup || !editTitle.trim() || !editDateTime) return
    setSaving(true)
    await supabase
      .from('meetups')
      .update({
        title: editTitle.trim(),
        tee_time: new Date(editDateTime).toISOString(),
        max_players: editMaxPlayers,
        course_id: editCourseId || null,
        description: editDescription.trim() || null,
      })
      .eq('id', editMeetup.id)
    setEditMeetup(null)
    setSaving(false)
    await fetchMeetups()
  }

  // Looking to Play submit
  async function handleLtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !ltpDay || !ltpArea.trim()) return
    setSubmitting(true)

    const date = new Date(ltpDay)
    const hour = ltpTime === 'morning' ? 8 : ltpTime === 'afternoon' ? 14 : 10
    date.setHours(hour, 0, 0, 0)

    const dayLabel = format(date, 'EEEE')
    const timeLabel = ltpTime === 'anytime' ? '' : ` ${ltpTime}`
    const title = `Looking to play ${dayLabel}${timeLabel} in ${ltpArea.trim()}`

    const desc = [
      `Area: ${ltpArea.trim()}`,
      user.handicap != null ? `Handicap: ${user.handicap}` : null,
      ltpNotes.trim() || null,
    ].filter(Boolean).join('\n')

    const { data: newMeetup } = await supabase
      .from('meetups')
      .insert({
        title,
        course_id: null,
        tee_time: date.toISOString(),
        max_players: ltpPlayers,
        description: desc,
        organizer_id: user.id,
      })
      .select()
      .single()

    if (newMeetup) {
      await supabase.from('meetup_attendees').insert({ meetup_id: newMeetup.id, user_id: user.id })
    }

    setLtpDay('')
    setLtpTime('morning')
    setLtpNotes('')
    setLtpPlayers(4)
    setShowCreate(false)
    setSubmitting(false)
    await fetchMeetups()
  }

  // Specific Tee Time submit
  async function handleSpecificSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !formTitle.trim() || !formDateTime) return
    setSubmitting(true)

    const { data: newMeetup } = await supabase
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

    if (newMeetup) {
      await supabase.from('meetup_attendees').insert({ meetup_id: newMeetup.id, user_id: user.id })
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
    return user ? (meetup.meetup_attendees?.some(a => a.user_id === user.id) ?? false) : false
  }

  function getStatus(meetup: Meetup): 'open' | 'full' | 'past' {
    if (isPast(new Date(meetup.tee_time))) return 'past'
    if ((meetup.meetup_attendees?.length ?? 0) >= meetup.max_players) return 'full'
    return 'open'
  }

  function isLookingToPlay(meetup: Meetup): boolean {
    return !meetup.course_id
  }

  function getAreaFromDescription(desc: string | null): string | null {
    if (!desc) return null
    const match = desc.match(/^Area:\s*(.+)$/m)
    return match ? match[1] : null
  }

  // Build quick day options
  function getQuickDays() {
    const days: { label: string; value: string }[] = []
    const now = new Date()
    for (let i = 0; i < 10; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const val = `${yyyy}-${mm}-${dd}`
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE, MMM d')
      days.push({ label, value: val })
    }
    return days
  }

  const filteredMeetups = meetups.filter(meetup => {
    const teeTime = new Date(meetup.tee_time)
    const status = getStatus(meetup)

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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesCourse = meetup.courses?.name?.toLowerCase().includes(q) ||
        meetup.courses?.city?.toLowerCase().includes(q) ||
        meetup.courses?.parent_club?.toLowerCase().includes(q)
      const matchesTitle = meetup.title.toLowerCase().includes(q)
      const matchesOrganizer = meetup.profiles?.full_name?.toLowerCase().includes(q)
      const matchesArea = getAreaFromDescription(meetup.description)?.toLowerCase().includes(q)
      if (!matchesCourse && !matchesTitle && !matchesOrganizer && !matchesArea) return false
    }

    return true
  })

  const filterTabs: { key: Filter; label: string }[] = [
    { key: 'open', label: "Who's Playing" },
    { key: 'my_times', label: 'My Rounds' },
    { key: 'past', label: 'In the Books' },
  ]

  const quickDays = getQuickDays()

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-white">The Board</h1>
          {user && (
            <button
              onClick={() => { setShowCreate(true); setCreateMode('looking') }}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Hand className="w-4 h-4" />
              I&apos;m Down to Play
            </button>
          )}
        </div>
        <p className="text-gray-400 mb-6">
          See who&apos;s playing, jump in on a round, or post up your own.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Find a game..."
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

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <div className="relative bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Mode Toggle */}
              <div className="flex border-b border-dark-700">
                <button
                  onClick={() => setCreateMode('looking')}
                  className={`flex-1 px-5 py-4 text-sm font-semibold transition-colors ${
                    createMode === 'looking'
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Hand className="w-4 h-4 inline mr-2" />
                  I&apos;m Down
                </button>
                <button
                  onClick={() => setCreateMode('specific')}
                  className={`flex-1 px-5 py-4 text-sm font-semibold transition-colors ${
                    createMode === 'specific'
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Got a Tee Time
                </button>
              </div>

              {/* Looking to Play Form */}
              {createMode === 'looking' && (
                <form onSubmit={handleLtpSubmit} className="p-5 space-y-4">
                  <p className="text-gray-400 text-sm">
                    Drop your day and area. Golfers nearby will see it and jump in.
                  </p>

                  {/* Day selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">When you trying to play?</label>
                    <div className="flex flex-wrap gap-2">
                      {quickDays.slice(0, 7).map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => setLtpDay(day.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            ltpDay === day.value
                              ? 'bg-emerald-600 text-white'
                              : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 border border-dark-600'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time of day */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">What time works?</label>
                    <div className="flex gap-2">
                      {([['morning', 'Morning'], ['afternoon', 'Afternoon'], ['anytime', 'Anytime']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setLtpTime(val)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            ltpTime === val
                              ? 'bg-emerald-600 text-white'
                              : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 border border-dark-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Where at?</label>
                    <input
                      type="text"
                      value={ltpArea}
                      onChange={e => setLtpArea(e.target.value)}
                      placeholder="e.g. West Palm Beach, Jupiter, Boca..."
                      required
                      className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Group size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">How many deep?</label>
                    <div className="flex gap-2">
                      {[2, 3, 4].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setLtpPlayers(n)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            ltpPlayers === n
                              ? 'bg-emerald-600 text-white'
                              : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 border border-dark-600'
                          }`}
                        >
                          {n} players
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Anything else? <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={ltpNotes}
                      onChange={e => setLtpNotes(e.target.value)}
                      placeholder="Walking, riding, skill level, vibes..."
                      className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 bg-dark-700 hover:bg-dark-600 hover:text-white transition-colors">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !ltpDay || !ltpArea.trim()}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Dropping...' : 'Drop It'}
                    </button>
                  </div>
                </form>
              )}

              {/* Specific Tee Time Form */}
              {createMode === 'specific' && (
                <form onSubmit={handleSpecificSubmit} className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">What&apos;s the move?</label>
                    <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Need a 3rd for Saturday at Ibis" required className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Where?</label>
                    <input type="text" value={formClub} onChange={e => { setFormClub(e.target.value); setFormCourseId(''); setShowAddCourse(false) }} placeholder="Search courses..." className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none mb-2" />
                    {formClub.trim() && !formCourseId && !showAddCourse && (() => {
                      const filtered = courses.filter(c => c.name.toLowerCase().includes(formClub.toLowerCase()) || c.parent_club?.toLowerCase().includes(formClub.toLowerCase()))
                      return (
                        <div className="max-h-48 overflow-y-auto bg-dark-700 border border-dark-600 rounded-xl">
                          {filtered.slice(0, 6).map(course => (
                            <button key={course.id} type="button" onClick={() => { setFormCourseId(course.id); setFormClub(course.parent_club ? `${course.parent_club} - ${course.name}` : course.name) }} className="w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-dark-600 last:border-b-0 text-gray-300 hover:bg-dark-600">
                              <span className="font-medium">{course.name}</span>
                              {course.parent_club && <span className="text-gray-500 text-xs ml-2">{course.parent_club}</span>}
                              {course.city && <span className="text-gray-500 text-xs ml-1">&middot; {course.city}, {course.state}</span>}
                              {course.price_tier && (
                                <span className={`text-xs font-bold ml-2 ${
                                  course.price_tier === 1 ? 'text-green-400' :
                                  course.price_tier === 2 ? 'text-emerald-400' :
                                  course.price_tier === 3 ? 'text-yellow-400' :
                                  'text-orange-400'
                                }`}>
                                  {'$'.repeat(course.price_tier)}
                                </span>
                              )}
                              {course.is_private && <span className="text-[10px] text-gray-500 ml-1">Private</span>}
                            </button>
                          ))}
                          {/* Add Course option */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddCourse(true)
                              setNewCourseName(formClub.trim())
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-900/20 border-t border-dark-600 transition-colors"
                          >
                            + Don&apos;t see it? Add &quot;{formClub.trim()}&quot;
                          </button>
                        </div>
                      )
                    })()}

                    {/* Add Course inline form */}
                    {showAddCourse && (
                      <div className="bg-dark-700 border border-emerald-800/40 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-emerald-400">Add a new course</p>
                        <input
                          type="text"
                          value={newCourseName}
                          onChange={e => setNewCourseName(e.target.value)}
                          placeholder="Course name"
                          className="w-full bg-dark-600 border border-dark-500 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                        <input
                          type="text"
                          value={newCourseClub}
                          onChange={e => setNewCourseClub(e.target.value)}
                          placeholder="Club name (optional, e.g. Ibis Golf & CC)"
                          className="w-full bg-dark-600 border border-dark-500 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                        <input
                          type="text"
                          value={newCourseCity}
                          onChange={e => setNewCourseCity(e.target.value)}
                          placeholder="City (e.g. West Palm Beach)"
                          className="w-full bg-dark-600 border border-dark-500 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowAddCourse(false)} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-dark-600 hover:bg-dark-500 transition-colors">Cancel</button>
                          <button
                            type="button"
                            onClick={handleAddCourse}
                            disabled={addingCourse || !newCourseName.trim() || !newCourseCity.trim()}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                          >
                            {addingCourse ? 'Adding...' : 'Add Course'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">When?</label>
                    <input type="datetime-local" value={formDateTime} onChange={e => setFormDateTime(e.target.value)} required className="w-full bg-dark-700 border border-dark-600 text-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">How many?</label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5, 6, 8].map(n => (
                        <button key={n} type="button" onClick={() => setFormMaxPlayers(n)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${formMaxPlayers === n ? 'bg-emerald-600 text-white' : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 border border-dark-600'}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Details <span className="text-gray-500 font-normal">(optional)</span></label>
                    <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Cart or walk, vibe check, whatever..." rows={2} className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 bg-dark-700 hover:bg-dark-600 hover:text-white transition-colors">Cancel</button>
                    <button type="submit" disabled={submitting || !formTitle.trim() || !formDateTime} className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{submitting ? 'Locking in...' : 'Lock It In'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-dark-800 rounded-2xl border border-dark-700 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-dark-700" />
                  <div className="space-y-2 flex-1"><div className="h-5 w-48 bg-dark-700 rounded" /><div className="h-3 w-24 bg-dark-700 rounded" /></div>
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
              {filter === 'open' && "The board's empty"}
              {filter === 'my_times' && "You haven't jumped in yet"}
              {filter === 'past' && 'Nothing in the books yet'}
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
              {filter === 'open' && "Drop your availability and let the crew know you're ready to roll."}
              {filter === 'my_times' && "Check who's playing and hop in on a round."}
              {filter === 'past' && 'Your rounds will show up here after you play.'}
            </p>
            {filter === 'open' && user && (
              <button
                onClick={() => { setShowCreate(true); setCreateMode('looking') }}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors"
              >
                <Hand className="w-4 h-4" />
                I&apos;m Down to Play
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetups.map(meetup => {
              const status = getStatus(meetup)
              const attendeeCount = meetup.meetup_attendees?.length ?? 0
              // Organizer always counts even if attendee insert failed
              const effectiveCount = Math.max(attendeeCount, meetup.organizer_id ? 1 : 0)
              const spotsLeft = meetup.max_players - effectiveCount
              const attending = isUserAttending(meetup)
              const isOrganizer = user?.id === meetup.organizer_id
              const ltp = isLookingToPlay(meetup)
              const area = getAreaFromDescription(meetup.description)

              return (
                <div
                  key={meetup.id}
                  className={`rounded-2xl border overflow-hidden hover:border-dark-600 transition-colors ${
                    ltp
                      ? 'bg-gradient-to-br from-dark-800 to-emerald-950/20 border-emerald-900/30'
                      : 'bg-dark-800 border-dark-700'
                  }`}
                >
                  <div className="p-5">
                    {/* LTP badge */}
                    {ltp && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-900/50 text-emerald-400 border border-emerald-800/40">
                          <Hand className="w-3 h-3" />
                          Down to Play
                        </span>
                      </div>
                    )}

                    {/* Organizer row */}
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
                            {meetup.profiles?.handicap != null && (
                              <span className="inline-flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                {meetup.profiles.handicap} hdcp
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

                      {status === 'open' && spotsLeft > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {spotsLeft} open
                        </span>
                      )}
                      {status === 'open' && spotsLeft <= 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-800/50">Squad&apos;s Full</span>
                      )}
                      {status === 'full' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-800/50">Squad&apos;s Full</span>
                      )}
                      {status === 'past' && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-dark-700 text-gray-400 border border-dark-600">In the Books</span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-semibold text-base mb-3">{meetup.title}</h3>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
                      {ltp && area && (
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="font-medium">{area}</span>
                        </div>
                      )}
                      {meetup.courses && (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">
                            {meetup.courses.parent_club ? `${meetup.courses.parent_club} - ` : ''}
                            {meetup.courses.name}
                          </span>
                          {meetup.courses.price_tier && (
                            <span className={`text-xs font-bold flex-shrink-0 ${
                              meetup.courses.price_tier === 1 ? 'text-green-400' :
                              meetup.courses.price_tier === 2 ? 'text-emerald-400' :
                              meetup.courses.price_tier === 3 ? 'text-yellow-400' :
                              'text-orange-400'
                            }`}>
                              {'$'.repeat(meetup.courses.price_tier)}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{format(new Date(meetup.tee_time), 'EEE, MMM d')}</span>
                      </div>
                      {!ltp && (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>{format(new Date(meetup.tee_time), 'h:mm a')}</span>
                        </div>
                      )}
                      {ltp && (
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>
                            {new Date(meetup.tee_time).getHours() === 8 ? 'Morning' :
                             new Date(meetup.tee_time).getHours() === 14 ? 'Afternoon' : 'Anytime'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Attendees */}
                    {attendeeCount > 0 && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex -space-x-2">
                          {meetup.meetup_attendees?.slice(0, 5).map(a => (
                            <div key={a.id} className="w-8 h-8 rounded-full border-2 border-dark-800 bg-dark-600 flex items-center justify-center overflow-hidden" title={`${a.profiles?.full_name || 'Player'}${a.profiles?.handicap != null ? ` (${a.profiles.handicap} hdcp)` : ''}`}>
                              {a.profiles?.avatar_url ? (
                                <img src={a.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-gray-300 text-xs font-medium">{a.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {meetup.meetup_attendees?.slice(0, 2).map(a => a.profiles?.full_name?.split(' ')[0]).join(', ')}
                          {attendeeCount > 2 && ` +${attendeeCount - 2}`}
                        </span>
                        {!isPast(new Date(meetup.tee_time)) && (
                          <span className="text-xs text-gray-600 ml-auto">{formatDistanceToNow(new Date(meetup.tee_time), { addSuffix: true })}</span>
                        )}
                      </div>
                    )}

                    {/* Notes (excluding area line for LTP) */}
                    {meetup.description && (
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                        {ltp
                          ? meetup.description.split('\n').filter(l => !l.startsWith('Area:') && !l.startsWith('Handicap:')).join(' ').trim() || null
                          : meetup.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {status !== 'past' && user && !isOrganizer && (
                        <>
                          {attending ? (
                            <button onClick={() => handleLeave(meetup.id)} disabled={joining === meetup.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-red-900/30 hover:text-red-400 border border-dark-600 hover:border-red-800/50 transition-colors disabled:opacity-50">
                              {joining === meetup.id ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                              Bail
                            </button>
                          ) : status === 'open' && spotsLeft > 0 ? (
                            <button onClick={() => handleJoin(meetup.id)} disabled={joining === meetup.id} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-900/30 disabled:opacity-50">
                              {joining === meetup.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                              I&apos;m In
                            </button>
                          ) : null}
                        </>
                      )}
                      {attending && !isOrganizer && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          You&apos;re in
                        </span>
                      )}

                      {/* Edit / Delete for organizer and attendees */}
                      {status !== 'past' && (isOrganizer || attending) && (
                        <button
                          onClick={() => openEdit(meetup)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      {status !== 'past' && isOrganizer && (
                        <button
                          onClick={() => setDeleteId(meetup.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <Link href={`/tee-times/${meetup.id}`} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 font-medium transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        Group Chat
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

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !deleting && setDeleteId(null)}>
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-2">Delete Tee Time?</h3>
            <p className="text-gray-400 text-sm mb-6">This will remove the tee time from The Board and notify all attendees. This can&apos;t be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editMeetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !saving && setEditMeetup(null)}>
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-4">Edit Tee Time</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={editDateTime}
                  onChange={e => setEditDateTime(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Course</label>
                <select
                  value={editCourseId}
                  onChange={e => setEditCourseId(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">No specific course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.parent_club ? `${c.parent_club} - ` : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Max Players</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEditMaxPlayers(n)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        editMaxPlayers === n
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
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Notes</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditSave}
                disabled={saving || !editTitle.trim() || !editDateTime}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditMeetup(null)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
