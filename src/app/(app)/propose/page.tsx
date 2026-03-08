'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Calendar, MapPin, Send, Sparkles, Bot, User as UserIcon, Check } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { format } from 'date-fns'

type CourseOption = {
  id: string
  name: string
  city: string | null
  state: string | null
  parent_club: string | null
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  times?: { dateTime: string; label: string }[]
  courses?: { id: string; name: string }[]
  title?: string | null
}

export default function ProposePage() {
  const supabase = createClient()
  const router = useRouter()
  const { userId, profile } = useUser()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [times, setTimes] = useState<string[]>([''])
  const [courseSearch, setCourseSearch] = useState('')
  const [allCourses, setAllCourses] = useState<CourseOption[]>([])
  const [selectedCourses, setSelectedCourses] = useState<{ id?: string; name: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "I'm your AI caddie. Tell me two things:\n\n1. When are you free? (e.g. \"Saturday morning\" or \"any day except Wednesday\")\n2. Where do you want to play? (e.g. \"near West Palm Beach\" or \"Ibis\")\n\nI'll set up the proposal and you can share it with your group.",
      times: [],
      title: null,
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [timesApplied, setTimesApplied] = useState(false)

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

  useEffect(() => {
    const el = chatContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatMessages, chatLoading])

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

  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() }
    const updatedMessages = [...chatMessages, userMsg]
    setChatMessages(updatedMessages)
    setChatInput('')
    setChatLoading(true)
    setTimesApplied(false)

    try {
      const res = await fetch('/api/propose-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.message || "I'm having trouble understanding. Can you rephrase?",
        times: data.times || [],
        courses: data.courses || [],
        title: data.title || null,
      }

      setChatMessages(prev => [...prev, assistantMsg])

      // Auto-apply times if we got some
      if (data.times && data.times.length > 0) {
        setTimes(data.times.map((t: { dateTime: string }) => t.dateTime))
        setTimesApplied(true)
      }
      // Auto-apply courses if we got some
      if (data.courses && data.courses.length > 0) {
        setSelectedCourses(prev => {
          const existingIds = new Set(prev.map(c => c.id))
          const newCourses = data.courses
            .filter((c: { id: string }) => !existingIds.has(c.id))
            .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
          return [...prev, ...newCourses]
        })
      }
      if (!title.trim()) {
        setTitle(data.title || 'Golf this week')
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. You can fill in the form manually below.', times: [], title: null },
      ])
    } finally {
      setChatLoading(false)
      chatInputRef.current?.focus()
    }
  }

  function applyTimes(msgTimes: { dateTime: string; label: string }[]) {
    setTimes(msgTimes.map(t => t.dateTime))
    setTimesApplied(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!userId) {
      setSubmitError('You must be logged in to create a proposal.')
      return
    }
    if (!title.trim()) {
      setSubmitError('Give your round a title.')
      return
    }
    if (times.filter(t => t).length === 0) {
      setSubmitError('Add at least one time option.')
      return
    }

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
      setSubmitError(`Failed to create proposal: ${error?.message || 'Unknown error'}`)
      setSubmitting(false)
      return
    }

    const validTimes = times.filter(t => t)
    if (validTimes.length > 0) {
      await supabase.from('proposal_times').insert(
        validTimes.map(t => ({
          proposal_id: proposal.id,
          date_time: new Date(t).toISOString(),
        }))
      )
    }

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

  const filteredCourses = allCourses.filter(c =>
    !courseSearch ||
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.parent_club?.toLowerCase().includes(courseSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Propose a Round</h1>
        <p className="text-gray-400 mb-6">
          Tell the AI caddie when you&apos;re free and where you want to play. It&apos;ll set up the proposal, then you share the link with your group so everyone can vote.
        </p>

        {/* AI Chat */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 mb-8 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-dark-700 bg-dark-900/50">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-semibold text-sm">AI Caddie</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 font-medium">
              AI-powered
            </span>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="px-4 py-4 max-h-80 overflow-y-auto space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'assistant' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-dark-600 text-gray-300'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-dark-700 text-gray-200 rounded-tl-md'
                      : 'bg-emerald-600 text-white rounded-tr-md'
                  }`}>
                    {msg.content}
                  </div>

                  {/* Show parsed times */}
                  {msg.role === 'assistant' && msg.times && msg.times.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.times.map((t, j) => (
                        <div key={j} className="inline-flex items-center gap-1.5 bg-dark-700 border border-dark-600 px-2.5 py-1 rounded-lg text-xs text-gray-300 mr-1">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          {t.label}
                        </div>
                      ))}
                      {!timesApplied && (
                        <button
                          type="button"
                          onClick={() => applyTimes(msg.times!)}
                          className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Use these times
                        </button>
                      )}
                      {timesApplied && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400">
                          <Check className="w-3 h-3" />
                          Applied to form
                        </span>
                      )}
                    </div>
                  )}

                  {/* Show suggested courses */}
                  {msg.role === 'assistant' && msg.courses && msg.courses.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.courses.map((c, j) => (
                        <div key={j} className="inline-flex items-center gap-1.5 bg-dark-700 border border-dark-600 px-2.5 py-1 rounded-lg text-xs text-gray-300 mr-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          {c.name}
                        </div>
                      ))}
                      <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400">
                        <Check className="w-3 h-3" />
                        Added to form
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-900/50 text-emerald-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-dark-700 px-4 py-3 rounded-2xl rounded-tl-md">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="px-4 py-3 border-t border-dark-700 bg-dark-900/30">
            <div className="flex gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend() } }}
                placeholder="e.g. Saturday morning near West Palm Beach..."
                disabled={chatLoading}
                className="flex-1 bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading}
                className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-dark-700" />
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">or fill in manually</span>
          <div className="flex-1 h-px bg-dark-700" />
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
          {submitError && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-4 py-3 rounded-xl">
              {submitError}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
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
