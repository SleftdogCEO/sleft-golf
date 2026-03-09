'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, MapPin, Send, Bot, User as UserIcon, Check, Users, Clock } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { format } from 'date-fns'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  times?: { dateTime: string; label: string }[]
  courses?: { id: string; name: string }[]
  title?: string | null
}

export default function ProposePage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { userId, profile } = useUser()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hey, I'm your Sleft Caddie! Tell me when you want to play, what area, and how many players you need — I'll get it posted to Tee Times for you.",
      times: [],
      title: null,
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Ready-to-post state (set when AI returns complete data)
  const [readyData, setReadyData] = useState<{
    title: string
    times: { dateTime: string; label: string }[]
    courses: { id: string; name: string }[]
  } | null>(null)
  const [groupSize, setGroupSize] = useState(4)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    const el = chatContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatMessages, chatLoading, readyData])

  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() }
    const updatedMessages = [...chatMessages, userMsg]
    setChatMessages(updatedMessages)
    setChatInput('')
    setChatLoading(true)
    setReadyData(null)

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

      // If we have times AND courses, the round is ready to post
      if (data.times?.length > 0 && data.courses?.length > 0) {
        setReadyData({
          title: data.title || 'Golf round',
          times: data.times,
          courses: data.courses,
        })
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong — try again.', times: [], title: null },
      ])
    } finally {
      setChatLoading(false)
      chatInputRef.current?.focus()
    }
  }

  async function handlePostToTeetimes() {
    if (!userId || !readyData || posting) return
    setPosting(true)

    // Use the first time and first course
    const teeTime = readyData.times[0]
    const course = readyData.courses[0]

    const { data: newMeetup } = await supabase
      .from('meetups')
      .insert({
        title: readyData.title,
        course_id: course.id || null,
        tee_time: new Date(teeTime.dateTime).toISOString(),
        max_players: groupSize,
        description: readyData.times.length > 1
          ? `Flexible times: ${readyData.times.map(t => t.label).join(', ')}`
          : null,
        organizer_id: userId,
      })
      .select()
      .single()

    if (newMeetup) {
      await supabase.from('meetup_attendees').insert({
        meetup_id: newMeetup.id,
        user_id: userId,
      })
    }

    setPosting(false)
    router.push('/tee-times')
  }

  async function handlePostLooking() {
    if (!userId || !readyData || posting) return
    setPosting(true)

    const teeTime = readyData.times[0]
    const date = new Date(teeTime.dateTime)
    const hour = date.getHours()
    const timeLabel = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const dayLabel = format(date, 'EEEE')
    const area = readyData.courses[0]?.name?.split(' - ')[0] || 'the area'

    const title = `Looking to play ${dayLabel} ${timeLabel} near ${area}`

    const { data: newMeetup } = await supabase
      .from('meetups')
      .insert({
        title,
        course_id: null,
        tee_time: date.toISOString(),
        max_players: groupSize,
        description: `Area: ${area}\n${profile?.handicap != null ? `Handicap: ${profile.handicap}` : ''}`,
        organizer_id: userId,
      })
      .select()
      .single()

    if (newMeetup) {
      await supabase.from('meetup_attendees').insert({
        meetup_id: newMeetup.id,
        user_id: userId,
      })
    }

    setPosting(false)
    router.push('/tee-times')
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Sleft Caddie Chat */}
        <div className="bg-gradient-to-br from-dark-800 to-emerald-950/20 rounded-2xl border border-emerald-900/30 overflow-hidden shadow-xl shadow-emerald-900/10 flex flex-col" style={{ minHeight: 'calc(100vh - 8rem)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-dark-700 bg-dark-900/60">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Sleft Caddie</h1>
              <p className="text-emerald-400 text-xs font-medium">Tell me when, where, and how many — I&apos;ll post it</p>
            </div>
            <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-400 font-semibold border border-emerald-800/30">
              AI-powered
            </span>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 px-5 py-5 overflow-y-auto space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'assistant' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-dark-600 text-gray-300'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                </div>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-4 py-3 rounded-2xl text-base leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-dark-700 text-gray-200 rounded-tl-md'
                      : 'bg-emerald-600 text-white rounded-tr-md'
                  }`}>
                    {msg.content}
                  </div>

                  {/* Show parsed times */}
                  {msg.role === 'assistant' && msg.times && msg.times.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.times.map((t, j) => (
                        <span key={j} className="inline-flex items-center gap-1.5 bg-dark-700 border border-dark-600 px-2.5 py-1 rounded-lg text-xs text-gray-300">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Show suggested courses */}
                  {msg.role === 'assistant' && msg.courses && msg.courses.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {msg.courses.map((c, j) => (
                        <span key={j} className="inline-flex items-center gap-1.5 bg-dark-700 border border-dark-600 px-2.5 py-1 rounded-lg text-xs text-gray-300">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {chatLoading && (
              <div className="flex gap-2.5">
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-900/50 text-emerald-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-dark-700 px-5 py-4 rounded-2xl rounded-tl-md">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Ready to Post Card */}
            {readyData && !posting && (
              <div className="bg-dark-900/80 rounded-2xl border border-emerald-800/40 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Ready to post</span>
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <p className="text-white font-medium text-sm">{readyData.title}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    {readyData.times.slice(0, 3).map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-dark-700 px-2 py-1 rounded-lg">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        {t.label}
                      </span>
                    ))}
                    {readyData.courses.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-dark-700 px-2 py-1 rounded-lg">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Group Size */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    <Users className="w-3.5 h-3.5 inline mr-1" />
                    Group size
                  </label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setGroupSize(n)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                          groupSize === n
                            ? 'bg-emerald-600 text-white'
                            : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 border border-dark-600'
                        }`}
                      >
                        {n} players
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    You + {groupSize - 1} more — {groupSize - 1} spot{groupSize - 1 !== 1 ? 's' : ''} open
                  </p>
                </div>

                {/* Post Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handlePostToTeetimes}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30"
                  >
                    <Calendar className="w-4 h-4" />
                    Post Tee Time
                  </button>
                  <button
                    onClick={handlePostLooking}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-dark-700 text-gray-200 px-4 py-3 rounded-xl font-semibold text-sm hover:bg-dark-600 border border-dark-600 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Looking to Play
                  </button>
                </div>
              </div>
            )}

            {/* Posting spinner */}
            {posting && (
              <div className="bg-dark-900/80 rounded-2xl border border-emerald-800/40 p-6 flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-emerald-400 font-medium">Posting to Tee Times...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="px-5 py-4 border-t border-dark-700 bg-dark-900/40">
            <div className="flex gap-3">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend() } }}
                placeholder="e.g. Saturday morning near West Palm, need a 4th..."
                disabled={chatLoading || posting}
                className="flex-1 bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-5 py-3.5 text-base focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleChatSend}
                disabled={!chatInput.trim() || chatLoading || posting}
                className="px-4 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
