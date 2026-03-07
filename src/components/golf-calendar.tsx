'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Round, Profile, Course } from '@/lib/types'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Clock,
  Users,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { WeatherWidget } from '@/components/weather-widget'
import { useUser } from '@/hooks/use-user'

type RoundWithJoins = Round & { profiles?: Profile; courses?: Course }

type CalendarDay = {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  rounds: RoundWithJoins[]
}

function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: CalendarDay[] = []

  // Days from previous month to fill first week
  const startPadding = firstDay.getDay()
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({ date, isCurrentMonth: false, isToday: false, rounds: [] })
  }

  // Days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    date.setHours(0, 0, 0, 0)
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.getTime() === today.getTime(),
      rounds: [],
    })
  }

  // Fill remaining to complete last week
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false, isToday: false, rounds: [] })
    }
  }

  return days
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function GolfCalendar() {
  const supabase = createClient()
  const { userId } = useUser()
  const now = new Date()

  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [rounds, setRounds] = useState<RoundWithJoins[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])

  // Create round form
  const [newCourseId, setNewCourseId] = useState('')
  const [newTeeTime, setNewTeeTime] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchRounds = useCallback(async () => {
    setLoading(true)
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString()
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString()

    const { data } = await supabase
      .from('rounds')
      .select('*, profiles(*), courses(*)')
      .eq('is_public', true)
      .gte('tee_time', startOfMonth)
      .lte('tee_time', endOfMonth)
      .order('tee_time', { ascending: true })

    if (data) setRounds(data as RoundWithJoins[])
    setLoading(false)
  }, [currentMonth, currentYear, supabase])

  useEffect(() => {
    fetchRounds()
  }, [fetchRounds])

  useEffect(() => {
    async function fetchCourses() {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .order('name')
      if (courseData) setCourses(courseData)
    }
    fetchCourses()
  }, [supabase])

  // Build calendar grid
  const days = getMonthDays(currentYear, currentMonth)

  // Assign rounds to days
  const daysWithRounds = days.map(day => {
    const dayStart = new Date(day.date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day.date)
    dayEnd.setHours(23, 59, 59, 999)

    const dayRounds = rounds.filter(r => {
      if (!r.tee_time) return false
      const tee = new Date(r.tee_time)
      return tee >= dayStart && tee <= dayEnd
    })

    return { ...day, rounds: dayRounds }
  })

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
    setSelectedDay(null)
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
    setSelectedDay(null)
  }

  function goToToday() {
    setCurrentMonth(now.getMonth())
    setCurrentYear(now.getFullYear())
    setSelectedDay(null)
  }

  async function handleCreateRound(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !newCourseId || !newTeeTime) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('rounds').insert({
        user_id: userId,
        course_id: newCourseId,
        tee_time: new Date(newTeeTime).toISOString(),
        status: 'planned',
        notes: newNotes || null,
        is_public: true,
      })

      if (!error) {
        setShowCreateModal(false)
        setNewCourseId('')
        setNewTeeTime('')
        setNewNotes('')
        fetchRounds()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function openCreateForDate(date: Date) {
    // Pre-fill the date with 7:00 AM
    const d = new Date(date)
    d.setHours(7, 0, 0, 0)
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    setNewTeeTime(local.toISOString().slice(0, 16))
    setShowCreateModal(true)
  }

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={goToToday}
            className="text-xs font-medium text-emerald-400 bg-emerald-900/30 hover:bg-emerald-900/50 px-3 py-1 rounded-full transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-dark-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {daysWithRounds.map((day, idx) => {
              const hasRounds = day.rounds.length > 0
              const isSelected = selectedDay?.date.getTime() === day.date.getTime()

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[90px] p-2 border-b border-r border-dark-700 text-left transition-colors relative group ${
                    !day.isCurrentMonth ? 'bg-dark-900' : 'bg-dark-800 hover:bg-dark-700/50'
                  } ${isSelected ? 'bg-emerald-900/20 ring-2 ring-inset ring-emerald-400' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        day.isToday
                          ? 'bg-emerald-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                          : day.isCurrentMonth
                          ? 'text-white'
                          : 'text-gray-600'
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {day.isCurrentMonth && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          openCreateForDate(day.date)
                        }}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Round indicators */}
                  {hasRounds && (
                    <div className="mt-1 space-y-0.5">
                      {day.rounds.slice(0, 3).map(round => (
                        <div
                          key={round.id}
                          className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-medium ${
                            round.status === 'active'
                              ? 'bg-emerald-900/30 text-emerald-400'
                              : round.status === 'completed'
                              ? 'bg-dark-700 text-gray-400'
                              : 'bg-blue-900/30 text-blue-400'
                          }`}
                        >
                          {round.tee_time
                            ? new Date(round.tee_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                            : ''}{' '}
                          {round.profiles?.full_name?.split(' ')[0] || ''}
                        </div>
                      ))}
                      {day.rounds.length > 3 && (
                        <p className="text-[10px] text-gray-500 px-1">
                          +{day.rounds.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDay && selectedDay.rounds.length > 0 && (
        <div className="mt-4 bg-dark-800 rounded-2xl shadow-sm border border-dark-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">
                {selectedDay.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <p className="text-sm text-gray-400">
                {selectedDay.rounds.length} {selectedDay.rounds.length === 1 ? 'round' : 'rounds'} scheduled
              </p>
            </div>
            <button
              onClick={() => openCreateForDate(selectedDay.date)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Join this day
            </button>
          </div>

          <div className="divide-y divide-dark-700">
            {selectedDay.rounds.map(round => (
              <div key={round.id} className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {round.profiles?.avatar_url ? (
                      <img
                        src={round.profiles.avatar_url}
                        alt={round.profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-emerald-700 font-semibold text-sm">
                        {round.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {round.profiles?.full_name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {round.courses?.name || 'TBD'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {round.tee_time
                          ? new Date(round.tee_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'Time TBD'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        round.status === 'active' ? 'bg-emerald-900/30 text-emerald-400' :
                        round.status === 'completed' ? 'bg-dark-700 text-gray-400' :
                        'bg-blue-900/30 text-blue-400'
                      }`}>
                        {round.status}
                      </span>
                    </div>
                    {round.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">{round.notes}</p>
                    )}
                  </div>
                  {/* Weather for this round's course */}
                  {round.courses?.city && (
                    <div className="flex-shrink-0">
                      <WeatherWidget
                        location={`${round.courses.city}, ${round.courses.state || ''}`}
                        variant="inline"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Day - No Rounds */}
      {selectedDay && selectedDay.rounds.length === 0 && selectedDay.isCurrentMonth && (
        <div className="mt-4 bg-dark-800 rounded-2xl shadow-sm border border-dark-700 p-6 text-center">
          <CalendarIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm mb-3">
            No rounds on {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <button
            onClick={() => openCreateForDate(selectedDay.date)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule a round
          </button>
        </div>
      )}

      {/* Create Round Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
              <h3 className="text-lg font-bold text-white">Schedule a Round</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateRound} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Course</label>
                <select
                  value={newCourseId}
                  onChange={e => setNewCourseId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-dark-700 text-gray-100"
                >
                  <option value="">Select a course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.city ? `- ${c.city}, ${c.state}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tee Time</label>
                <input
                  type="datetime-local"
                  value={newTeeTime}
                  onChange={e => setNewTeeTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-dark-700 text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Looking for a foursome, handicap 15..."
                  className="w-full px-3 py-2 border border-dark-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-dark-700 text-gray-100 placeholder-gray-500"
                />
              </div>

              {/* Weather preview for selected course */}
              {newCourseId && (
                <div>
                  {(() => {
                    const course = courses.find(c => c.id === newCourseId)
                    if (course?.city) {
                      return (
                        <WeatherWidget
                          location={`${course.city}, ${course.state || ''}`}
                          courseName={course.name}
                          variant="compact"
                        />
                      )
                    }
                    return null
                  })()}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-dark-600 text-gray-300 rounded-lg hover:bg-dark-700 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newCourseId || !newTeeTime}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
