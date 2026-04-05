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
import { db } from '@/lib/db'

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
        fetch(`/api/courses/search?q=${encodeURIComponent(courseSearch)}`)
          .then(r => r.json())
          .then(data => { if (data) setCourses(data as Course[]) })
          .catch(() => {})
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
    // Use confirmed_count (includes off-app guests) or fall back to attendee count
    const attendeeIds = new Set(meetup.meetup_attendees?.map(a => a.user_id) || [])
    attendeeIds.add(meetup.organizer_id)
    const onAppCount = attendeeIds.size
    const confirmed = (meetup as any).confirmed_count || 1
    return Math.max(confirmed, onAppCount)
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
    const seen = new Set<string>()
    const players: Profile[] = []
    // Add organizer first
    if (meetup.profiles) {
      seen.add(meetup.profiles.id)
      players.push(meetup.profiles)
    }
    // Add attendees, skipping organizer duplicate
    for (const a of meetup.meetup_attendees || []) {
      if (a.profiles && !seen.has(a.profiles.id)) {
        seen.add(a.profiles.id)
        players.push(a.profiles)
      }
    }
    return players
  }

  async function joinMeetup(meetupId: string) {
    if (!userId) { router.push('/login?redirect=/calendar'); return }
    if (joining) return
    hapticMedium()
    setJoining(meetupId)
    await db.insert('meetup_attendees', { meetup_id: meetupId, user_id: userId })
    await fetchMeetups()
    setJoining(null)
  }

  async function leaveMeetup(meetupId: string) {
    if (!userId || joining) return
    setJoining(meetupId)
    await db.delete('meetup_attendees', { meetup_id: meetupId, user_id: userId })
    await fetchMeetups()
    setJoining(null)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await fetch('/api/meetups', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteId }) })
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
    await fetch('/api/meetups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editId,
        title: editTitle.trim(),
        tee_time: new Date(`${editDate}T${editTime}:00`).toISOString(),
        max_players: editMax,
      }),
    })
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

      await db.insert('meetups', {
        title,
        course_id: selectedCourse.id,
        tee_time: teeTime.toISOString(),
        max_players: parseInt(maxPlayers) || 4,
        organizer_id: userId,
      })

      hapticSuccess()
      resetForm()
      setSelectedDate(new Date(teeDateStr))
      fetchMeetups()
    } catch {
      setFormError('Failed to create tee time. Please try again.')
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
          <Link
            href="/propose"
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post a Time
          </Link>
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
            <Link
              href="/propose"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Be the first
            </Link>
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
                <Link
                  key={meetup.id}
                  href={`/tee-times/${meetup.id}`}
                  className={`block bg-dark-800 rounded-2xl border overflow-hidden transition-colors active:bg-dark-700 ${
                    isIn ? 'border-emerald-700/50' : isOpen ? 'border-dark-600' : 'border-dark-700 opacity-60'
                  }`}
                >
                  <div className="p-5">
                    {/* Top row: time + info + actions */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0 bg-emerald-900/30 border border-emerald-800/30 rounded-xl px-3 py-2.5 text-center min-w-[60px]">
                        <p className="text-xl font-black text-emerald-400 leading-none">{format(teeTime, 'h:mm')}</p>
                        <p className="text-[10px] font-semibold text-emerald-500/70 uppercase mt-0.5">{format(teeTime, 'a')}</p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-[15px] leading-tight truncate">{meetup.title}</h3>
                        {course && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="text-xs font-medium text-emerald-400/80 truncate">
                              {course.parent_club ? `${course.parent_club} - ` : ''}{course.name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] text-gray-400">
                            by <span className="font-medium text-gray-200">{meetup.profiles?.full_name?.split(' ')[0] || 'Unknown'}</span>
                          </span>
                          <span className="text-dark-600">·</span>
                          <span className="text-[11px] text-gray-500">
                            {getPlayerCount(meetup)}/{meetup.max_players} players
                          </span>
                          {isOpen && (
                            <>
                              <span className="text-dark-600">·</span>
                              <span className="text-[11px] font-semibold text-amber-400">
                                {spotsLeft} open
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-1.5" onClick={e => e.preventDefault()}>
                        {isOrganizer && (
                          <>
                            <button onClick={(e) => { e.preventDefault(); openEdit(meetup) }} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-600 transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.preventDefault(); setDeleteId(meetup.id) }} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {userId && !isOrganizer && isIn && (
                          <button onClick={(e) => { e.preventDefault(); leaveMeetup(meetup.id) }} disabled={joining === meetup.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-900/20 border border-red-800/30 hover:bg-red-900/30 transition-colors disabled:opacity-50">
                            <UserMinus className="w-3.5 h-3.5" /> Leave
                          </button>
                        )}
                        {!isIn && isOpen && (
                          <button onClick={(e) => { e.preventDefault(); joinMeetup(meetup.id) }} disabled={joining === meetup.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50">
                            <UserPlus className="w-3.5 h-3.5" /> Join
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description excerpt (if available) */}
                    {meetup.description && (
                      <p className="text-[11px] text-gray-500 mb-3 line-clamp-1 pl-[76px]">
                        {meetup.description.split('\n')[0]}
                      </p>
                    )}

                    {/* Players */}
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {players.map((player, idx) => (
                          <div key={player.id}
                            className={`w-9 h-9 rounded-full border-2 border-dark-800 flex items-center justify-center overflow-hidden ${idx === 0 ? 'bg-emerald-600/20 ring-1 ring-emerald-700/40' : 'bg-dark-700'}`}
                            title={player.full_name || undefined}>
                            {player.avatar_url ? (
                              <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className={`text-xs font-bold ${idx === 0 ? 'text-emerald-400' : 'text-gray-300'}`}>
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
                        <p className="text-xs text-gray-200 truncate font-medium">
                          {players.map(p => p.full_name?.split(' ')[0]).join(', ')}
                          {isOpen ? <span className="text-gray-500 font-normal"> + {spotsLeft} open</span> : ''}
                        </p>
                        {players.some(p => p.handicap != null) && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            HCP: {players.filter(p => p.handicap != null).map(p => `${p.full_name?.split(' ')[0]} ${p.handicap}`).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="p-2 rounded-lg text-gray-500" title="Match Room">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
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
