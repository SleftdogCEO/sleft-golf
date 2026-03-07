'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Round, Profile, Course } from '@/lib/types'
import { MapPin, Clock, Users, Circle, Plus, X } from 'lucide-react'
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns'
import { WeatherWidget } from '@/components/weather-widget'
import { QuickReactionBar } from '@/components/golf-reactions'
import { useUser } from '@/hooks/use-user'

type RoundWithJoins = Round & { profiles?: Profile; courses?: Course }

export default function LivePage() {
  const supabase = createClient()
  const { profile } = useUser()

  const [activeRounds, setActiveRounds] = useState<RoundWithJoins[]>([])
  const [plannedRounds, setPlannedRounds] = useState<RoundWithJoins[]>([])
  const [completedRounds, setCompletedRounds] = useState<RoundWithJoins[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [user, setUser] = useState<Profile | null>(null)

  // New round form state
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [teeTime, setTeeTime] = useState('')
  const [roundStatus, setRoundStatus] = useState<'planned' | 'active'>('planned')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRounds()
    fetchCourses()
  }, [])

  useEffect(() => {
    if (profile) setUser(profile)
  }, [profile])

  async function fetchCourses() {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('name')

    if (data) setCourses(data)
  }

  async function fetchRounds() {
    setLoading(true)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 2)

    const [activeRes, plannedRes, completedRes] = await Promise.all([
      supabase
        .from('rounds')
        .select('*, profiles(*), courses(*)')
        .eq('status', 'active')
        .order('tee_time'),
      supabase
        .from('rounds')
        .select('*, profiles(*), courses(*)')
        .eq('status', 'planned')
        .gte('tee_time', today.toISOString())
        .lte('tee_time', tomorrow.toISOString())
        .order('tee_time'),
      supabase
        .from('rounds')
        .select('*, profiles(*), courses(*)')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString())
        .order('score', { ascending: true })
        .limit(20),
    ])

    setActiveRounds(activeRes.data || [])
    setPlannedRounds(plannedRes.data || [])
    setCompletedRounds(completedRes.data || [])
    setLoading(false)
  }

  async function handleCreateRound(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !selectedCourseId) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('rounds').insert({
        user_id: user.id,
        course_id: selectedCourseId,
        tee_time: teeTime ? new Date(teeTime).toISOString() : null,
        status: roundStatus,
      })

      if (error) {
        console.error('Error creating round:', error)
      } else {
        setShowModal(false)
        setSelectedCourseId('')
        setTeeTime('')
        setRoundStatus('planned')
        fetchRounds()
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Group active rounds by course
  const activeByCourseName: Record<string, RoundWithJoins[]> = {}
  activeRounds.forEach(round => {
    const courseName = round.courses?.name || 'Unknown Course'
    if (!activeByCourseName[courseName]) {
      activeByCourseName[courseName] = []
    }
    activeByCourseName[courseName].push(round)
  })

  function formatTeeTime(teeTime: string | null) {
    if (!teeTime) return 'No tee time set'
    const date = new Date(teeTime)
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`
    return format(date, 'MMM d, h:mm a')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-6">Live Activity</h1>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 p-5 animate-pulse"
              >
                <div className="h-5 w-40 bg-dark-700 rounded mb-4" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-700" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-dark-700 rounded" />
                    <div className="h-3 w-24 bg-dark-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Live Activity</h1>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Start a Round
          </button>
        </div>

        {/* Section 1: Currently on the Course */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-white">Currently on the Course</h2>
          </div>

          {Object.keys(activeByCourseName).length === 0 ? (
            <div className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 p-8 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-gray-400 text-sm">No one is currently playing</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(activeByCourseName).map(([courseName, rounds]) => (
                <div
                  key={courseName}
                  className="bg-dark-800 rounded-2xl shadow-sm border-l-4 border-l-emerald-500 border border-dark-700 overflow-hidden"
                >
                  <div className="px-5 py-3 bg-emerald-900/20 border-b border-dark-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-white text-sm">{courseName}</span>
                        <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full font-medium">
                          {rounds.length} {rounds.length === 1 ? 'player' : 'players'}
                        </span>
                      </div>
                      {/* Inline weather for this course */}
                      {rounds[0]?.courses?.city && (
                        <WeatherWidget
                          location={`${rounds[0].courses.city}, ${rounds[0].courses.state || ''}`}
                          variant="inline"
                        />
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-dark-700">
                    {rounds.map(round => (
                      <div key={round.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
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
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-dark-800" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">
                            {round.profiles?.full_name || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {round.tee_time ? formatTeeTime(round.tee_time) : 'In progress'}
                          </div>
                        </div>
                        {/* Quick react to this player */}
                        <QuickReactionBar
                          recipientName={round.profiles?.full_name || 'them'}
                          onSend={() => {/* TODO: store reaction */}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Upcoming Tee Times */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-blue-500" />
            <h2 className="text-lg font-semibold text-white">Upcoming Tee Times</h2>
          </div>

          {plannedRounds.length === 0 ? (
            <div className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 p-8 text-center">
              <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-gray-400 text-sm">No upcoming tee times</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plannedRounds.map(round => (
                <div
                  key={round.id}
                  className="bg-dark-800 rounded-2xl shadow-sm border-l-4 border-l-blue-400 border border-dark-700 p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {round.profiles?.avatar_url ? (
                      <img
                        src={round.profiles.avatar_url}
                        alt={round.profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-400 font-semibold text-sm">
                        {round.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">
                      {round.profiles?.full_name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {round.courses?.name || 'Unknown Course'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {round.courses?.city && (
                      <WeatherWidget
                        location={`${round.courses.city}, ${round.courses.state || ''}`}
                        variant="inline"
                      />
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600">
                        {round.tee_time ? format(new Date(round.tee_time), 'h:mm a') : '--'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {round.tee_time ? (
                          isToday(new Date(round.tee_time)) ? 'Today' :
                          isTomorrow(new Date(round.tee_time)) ? 'Tomorrow' :
                          format(new Date(round.tee_time), 'MMM d')
                        ) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Best Scores Today */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 1l2.39 4.84L18 6.87l-4 3.9.94 5.51L10 13.49l-4.94 2.79L6 10.77l-4-3.9 5.61-1.03z" />
            </svg>
            <h2 className="text-lg font-semibold text-white">Best Scores Today</h2>
          </div>

          {completedRounds.length === 0 ? (
            <div className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 p-8 text-center">
              <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 1l2.39 4.84L18 6.87l-4 3.9.94 5.51L10 13.49l-4.94 2.79L6 10.77l-4-3.9 5.61-1.03z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">No completed rounds today</p>
            </div>
          ) : (
            <div className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 overflow-hidden">
              <div className="divide-y divide-dark-700">
                {completedRounds.map((round, index) => (
                  <div
                    key={round.id}
                    className="px-5 py-3 flex items-center gap-4"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      index === 0 ? 'bg-amber-900/30 text-amber-400' :
                      index === 1 ? 'bg-gray-700 text-gray-300' :
                      index === 2 ? 'bg-orange-900/30 text-orange-400' :
                      'bg-dark-700 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {round.profiles?.avatar_url ? (
                        <img
                          src={round.profiles.avatar_url}
                          alt={round.profiles.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 font-semibold text-sm">
                          {round.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">
                        {round.profiles?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {round.courses?.name || 'Unknown Course'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-bold ${
                        index === 0 ? 'text-emerald-400' : 'text-gray-300'
                      }`}>
                        {round.score ?? '--'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Start Round Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-dark-800 rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white">Start a Round</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRound} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    required
                    className="w-full border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-gray-100 bg-dark-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name}{course.city ? ` - ${course.city}, ${course.state}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Tee Time
                  </label>
                  <input
                    type="datetime-local"
                    value={teeTime}
                    onChange={e => setTeeTime(e.target.value)}
                    className="w-full border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-gray-100 bg-dark-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Status
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRoundStatus('planned')}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border transition-colors ${
                        roundStatus === 'planned'
                          ? 'bg-blue-900/30 border-blue-700 text-blue-400'
                          : 'bg-dark-700 border-dark-600 text-gray-400 hover:bg-dark-600'
                      }`}
                    >
                      Planned
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoundStatus('active')}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border transition-colors ${
                        roundStatus === 'active'
                          ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400'
                          : 'bg-dark-700 border-dark-600 text-gray-400 hover:bg-dark-600'
                      }`}
                    >
                      Playing Now
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedCourseId}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Round'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
