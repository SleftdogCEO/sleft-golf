'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Calendar, MapPin, Send, Smartphone, Sparkles } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { parseAvailability } from '@/lib/parse-availability'

type CourseOption = {
  id: string
  name: string
  city: string | null
  state: string | null
  parent_club: string | null
}

export default function ProposePage() {
  const supabase = createClient()
  const router = useRouter()
  const { userId, profile } = useUser()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [times, setTimes] = useState<string[]>([''])
  const [courseSearch, setCourseSearch] = useState('')
  const [allCourses, setAllCourses] = useState<CourseOption[]>([])
  const [selectedCourses, setSelectedCourses] = useState<{ id?: string; name: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [availabilityText, setAvailabilityText] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCourses() {
      const { data } = await supabase
        .from('courses')
        .select('id, name, city, state, parent_club')
        .order('name')
      if (data) setAllCourses(data)
    }
    fetchCourses()
  }, [])

  function addTime() {
    setTimes(prev => [...prev, ''])
  }

  function removeTime(index: number) {
    setTimes(prev => prev.filter((_, i) => i !== index))
  }

  function updateTime(index: number, value: string) {
    setTimes(prev => prev.map((t, i) => (i === index ? value : t)))
  }

  function addCourse(course: CourseOption) {
    if (!selectedCourses.some(c => c.id === course.id)) {
      setSelectedCourses(prev => [...prev, {
        id: course.id,
        name: course.parent_club ? `${course.parent_club} - ${course.name}` : course.name,
      }])
    }
    setCourseSearch('')
  }

  function removeCourse(index: number) {
    setSelectedCourses(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !title.trim() || times.filter(t => t).length === 0) return

    setSubmitting(true)

    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        title: title.trim(),
        organizer_id: userId,
        message: message.trim() || null,
      })
      .select()
      .single()

    if (error || !proposal) {
      console.error('Error creating proposal:', error)
      setSubmitting(false)
      return
    }

    // Insert time options
    const validTimes = times.filter(t => t)
    if (validTimes.length > 0) {
      await supabase.from('proposal_times').insert(
        validTimes.map(t => ({
          proposal_id: proposal.id,
          date_time: new Date(t).toISOString(),
        }))
      )
    }

    // Insert course options
    if (selectedCourses.length > 0) {
      await supabase.from('proposal_courses').insert(
        selectedCourses.map(c => ({
          proposal_id: proposal.id,
          course_id: c.id || null,
          course_name: c.name,
        }))
      )
    }

    setSubmitting(false)
    router.push(`/propose/${proposal.id}`)
  }

  function handleGenerateTimes() {
    setAiError(null)
    const slots = parseAvailability(availabilityText)
    if (slots.length === 0) {
      setAiError('Couldn\'t parse that. Try something like "Saturday morning or Sunday after 2pm"')
      return
    }
    setTimes(slots.map(s => s.dateTime))
    if (!title.trim()) {
      setTitle('Weekend round')
    }
    setAvailabilityText('')
  }

  const filteredCourses = allCourses.filter(c =>
    !courseSearch ||
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.parent_club?.toLowerCase().includes(courseSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Propose a Round</h1>
        <p className="text-gray-400 mb-8">
          Pick some times and courses, then send the link. Everyone votes on what works.
        </p>

        {/* Quick Availability Input */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold text-sm">Quick Setup</h2>
          </div>
          <p className="text-gray-500 text-xs mb-3">
            Type your availability and we&apos;ll fill in the times for you.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={availabilityText}
              onChange={e => { setAvailabilityText(e.target.value); setAiError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateTimes() } }}
              placeholder='e.g., "Saturday morning or Sunday after 2pm"'
              className="flex-1 bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
            <button
              type="button"
              onClick={handleGenerateTimes}
              disabled={!availabilityText.trim()}
              className="inline-flex items-center gap-1.5 bg-amber-600 text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              Fill Times
            </button>
          </div>
          {aiError && (
            <p className="text-red-400 text-xs mt-2">{aiError}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {['Saturday morning', 'This weekend', 'Tomorrow after 2pm', 'Friday at 10am or Saturday 8am'].map(example => (
              <button
                key={example}
                type="button"
                onClick={() => { setAvailabilityText(example); setAiError(null) }}
                className="text-xs px-2.5 py-1 rounded-full bg-dark-700 text-gray-400 hover:text-amber-400 hover:bg-dark-600 transition-colors border border-dark-600"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              What&apos;s the plan?
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='e.g., "Weekend round with the guys"'
              required
              className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Message <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Let everyone know what you're thinking..."
              rows={2}
              className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Time Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Calendar className="w-4 h-4 inline mr-1.5 text-emerald-400" />
              When could you play?
            </label>
            <div className="space-y-2">
              {times.map((time, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={time}
                    onChange={e => updateTime(i, e.target.value)}
                    required
                    className="flex-1 bg-dark-700 border border-dark-600 text-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTime(i)}
                      className="p-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-dark-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addTime}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add another time
            </button>
          </div>

          {/* Course Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1.5 text-emerald-400" />
              Where could you play? <span className="text-gray-500 font-normal">(optional)</span>
            </label>

            {selectedCourses.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedCourses.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 bg-emerald-900/40 text-emerald-300 border border-emerald-800/50 px-3 py-1.5 rounded-full text-xs font-medium"
                  >
                    {c.name}
                    <button
                      type="button"
                      onClick={() => removeCourse(i)}
                      className="text-emerald-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="text"
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />

            {courseSearch.trim() && (
              <div className="mt-1 max-h-40 overflow-y-auto bg-dark-700 border border-dark-600 rounded-xl">
                {filteredCourses.slice(0, 8).map(course => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => addCourse(course)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-600 transition-colors border-b border-dark-600 last:border-b-0"
                  >
                    <span className="font-medium">{course.name}</span>
                    {course.parent_club && (
                      <span className="text-gray-500 text-xs ml-2">{course.parent_club}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !title.trim() || times.filter(t => t).length === 0}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-semibold text-base hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-900/30"
          >
            <Send className="w-5 h-5" />
            {submitting ? 'Creating...' : 'Create & Share'}
          </button>
        </form>
      </div>
    </div>
  )
}
