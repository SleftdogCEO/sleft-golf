'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  X,
  Search,
  Send,
  Pencil,
  Trash2,
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
import type { Meetup, Profile, Course } from '@/lib/types'
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/haptics'

export default function CalendarPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const router = useRouter()
  const { userId } = useUser()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [dateOffset, setDateOffset] = useState(0)

  // Create tee time form
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [teeTimeStr, setTeeTimeStr] = useState('')
  const [teeDateStr, setTeeDateStr] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('4')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editMax, setEditMax] = useState(4)
  const [saving, setSaving] = useState(false)

  // Generate 14 days from offset
  const dates = useMemo(() => {
    const base = addDays(new Date(), dateOffset)
    return Array.from({ length: 14 }, (_, i) => addDays(base, i))
  }, [dateOffset])

  const dateRange = useMemo(() => ({
    start: startOfDay(dates[0]).toISOString(),
    end: addDays(startOfDay(dates[dates.length - 1]), 1).toISOString(),
  }), [dates])

  useEffect(() => { fetchMeetups() }, [dateRange])

  // Course search
  useEffect(() => {
    if (courseSearch.length >= 2) {
      const timeout = setTimeout(() => {
        supabase
          .from('courses')
          .select('*')
          .or(`name.ilike.%${courseSearch}%,parent_club.ilike.%${courseSearch}%,city.ilike.%${courseSearch}%`)
          .limit(6)
          .then(({ data }) => { if (data) setCourses(data as Course[]) })
      }, 200)
      return () => clearTimeout(timeout)
    } else {
      setCourses([])
    }
  }, [courseSearch])

  async function fetchMeetups() {
    setLoading(true)
    try {
      const res = await fetch(`/api/meetups/calendar?start=${encodeURIComponent(dateRange.start)}&end=${encodeURIComponent(dateRange.end)}`)
      if (res.ok) {
        const data = await res.json()
        setMeetups(data || [])
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('Calendar fetch error:', err.error || res.statusText)
        setMeetups([])
      }
    } catch (err) {
      console.error('Calendar fetch error:', err)
      setMeetups([])
    }
    setLoading(false)
  }

  const meetupsForSelected = useMemo(() => {
    return meetups.filter(m => isSameDay(parseISO(m.tee_time), selectedDate))
  }, [meetups, selectedDate])

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
    if (!userId) { router.push('/login?redirect=/calendar'); return }
    if (joining) return
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

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('meetups').delete().eq('id', deleteId)
    setDeleteId(null)
    setDeleting(false)
    fetchMeetups()
  }

  function openEdit(meetup: any) {
    const t = parseISO(meetup.tee_time)
    setEditId(meetup.id)
    setEditTitle(meetup.title)
    setEditDate(format(t, 'yyyy-MM-dd'))
    setEditTime(format(t, 'HH:mm'))
    setEditMax(meetup.max_players)
  }

  async function handleEditSave() {
    if (!editId || !editTitle.trim() || !editDate || !editTime) return
    setSaving(true)
    await supabase.from('meetups').update({
      title: editTitle.trim(),
      tee_time: new Date(`${editDate}T${editTime}:00`).toISOString(),
      max_players: editMax,
    }).eq('id', editId)
    setEditId(null)
    setSaving(false)
    fetchMeetups()
  }

  function openForm() {
    if (!userId) { router.push('/login?redirect=/calendar'); return }
    hapticLight()
    setTeeDateStr(format(selectedDate, 'yyyy-MM-dd'))
    setShowForm(true)
  }

  function resetForm() {
    setShowForm(false)
    setFormTitle('')
    setSelectedCourse(null)
    setCourseSearch('')
    setTeeTimeStr('')
    setTeeDateStr('')
    setMaxPlayers('4')
    setFormError(null)
  }

  async function handleCreateTeeTime() {
    if (!userId || !selectedCourse || !teeTimeStr || !teeDateStr) return
    setSubmitting(true)
    setFormError(null)

    try {
      const teeTime = new Date(`${teeDateStr}T${teeTimeStr}:00`)
      const title = formTitle.trim() || `Round at ${selectedCourse.name}`

      const { error } = await supabase.from('meetups').insert({
        title,
        course_id: selectedCourse.id,
        tee_time: teeTime.toISOString(),
        max_players: parseInt(maxPlayers) || 4,
        organizer_id: userId,
      })

      if (error) {
        setFormError('Failed to create tee time. Please try again.')
        setSubmitting(false)
        return
      }

      hapticSuccess()
      resetForm()
      setSelectedDate(new Date(teeDateStr))
      fetchMeetups()
    } catch {
      setFormError('Something went wrong.')
      setSubmitting(false)
    } finally {
      setSubmitting(false)
    }
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
          <button
            onClick={openForm}
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post a Time
          </button>
        </div>

        {/* Create Tee Time Form */}
        {showForm && (
          <div className="mb-5 bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">Post a Tee Time</h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {/* Course search */}
              {selectedCourse ? (
                <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-800/40 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="font-medium text-white text-sm">
                        {selectedCourse.parent_club ? `${selectedCourse.parent_club} - ` : ''}{selectedCourse.name}
                      </p>
                      {selectedCourse.city && <p className="text-xs text-gray-500">{selectedCourse.city}, {selectedCourse.state}</p>}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedCourse(null); setCourseSearch('') }} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    placeholder="Search for a course..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                  {courses.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-dark-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {courses.map(course => (
                        <button
                          key={course.id}
                          onClick={() => { setSelectedCourse(course); setCourseSearch(''); setCourses([]) }}
                          className="w-full text-left px-4 py-3 hover:bg-dark-600 transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center gap-3"
                        >
                          <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <div>
                            <span className="text-gray-100 text-sm font-medium">
                              {course.parent_club ? `${course.parent_club} - ` : ''}{course.name}
                            </span>
                            {course.city && <span className="text-gray-500 text-xs ml-2">{course.city}, {course.state}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date + Time + Players row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={teeDateStr}
                    onChange={e => setTeeDateStr(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Time</label>
                  <input
                    type="time"
                    value={teeTimeStr}
                    onChange={e => setTeeTimeStr(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Players</label>
                  <select
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>
              </div>

              {/* Optional title */}
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Title (optional, e.g. 'Saturday morning round')"
                maxLength={100}
                className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 text-sm"
              />

              {formError && (
                <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-3 py-2 rounded-xl">{formError}</div>
              )}

              <button
                onClick={handleCreateTeeTime}
                disabled={!selectedCourse || !teeTimeStr || !teeDateStr || submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post Tee Time'}
              </button>
            </div>
          </div>
        )}

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
                      <div className="flex gap-0.5 mt-0.5">
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
            <button
              onClick={openForm}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Be the first
            </button>
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
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 bg-dark-700 rounded-xl px-3 py-2.5 text-center min-w-[60px]">
                        <p className="text-xl font-black text-white leading-none">{format(teeTime, 'h:mm')}</p>
                        <p className="text-[10px] font-medium text-gray-500 uppercase mt-0.5">{format(teeTime, 'a')}</p>
                      </div>

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

                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        {isOrganizer && (
                          <>
                            <button onClick={() => openEdit(meetup)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-600 transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(meetup.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {userId && !isOrganizer && isIn && (
                          <button onClick={() => leaveMeetup(meetup.id)} disabled={joining === meetup.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-900/20 border border-red-800/30 hover:bg-red-900/30 transition-colors disabled:opacity-50">
                            <UserMinus className="w-3.5 h-3.5" /> Leave
                          </button>
                        )}
                        {!isIn && isOpen && (
                          <button onClick={() => joinMeetup(meetup.id)} disabled={joining === meetup.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50">
                            <UserPlus className="w-3.5 h-3.5" /> Join
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Players */}
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {players.map((player, idx) => (
                          <div key={player.id}
                            className={`w-9 h-9 rounded-full border-2 border-dark-800 flex items-center justify-center overflow-hidden ${idx === 0 ? 'bg-emerald-600/20' : 'bg-dark-700'}`}
                            title={player.full_name || undefined}>
                            {player.avatar_url ? (
                              <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className={`text-xs font-bold ${idx === 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                {player.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                        ))}
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
                        <Link href={`/tee-times/${meetup.id}`}
                          className="p-2 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-900/20 transition-colors" title="Match Room">
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

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !deleting && setDeleteId(null)}>
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-2">Delete Tee Time?</h3>
            <p className="text-gray-400 text-sm mb-6">This removes it from The Board. Can&apos;t be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => !saving && setEditId(null)}>
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-4">Edit Tee Time</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Time</label>
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-gray-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Max Players</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button key={n} type="button" onClick={() => setEditMax(n)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${editMax === n ? 'bg-emerald-600 text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600 border border-dark-600'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleEditSave} disabled={saving || !editTitle.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditId(null)} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
