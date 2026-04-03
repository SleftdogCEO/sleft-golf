'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, MapPin, Send, Bot, User as UserIcon, Check, Users, Clock } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { format } from 'date-fns'

type CourseChip = {
  id: string
  name: string
  price_tier?: number | null
  green_fee_estimate?: number | null
  is_private?: boolean
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  times?: { dateTime: string; label: string }[]
  courses?: CourseChip[]
  title?: string | null
}

export default function ProposePage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { userId, profile } = useUser()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hey, I'm your Sleft Caddie! Tell me when and where you want to play and I'll get it posted to The Board.",
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
    courses: CourseChip[]
    confirmed: number
    openSpots: number
  } | null>(null)
  const [posting, setPosting] = useState(false)
  const [wantMore, setWantMore] = useState<boolean | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedTimeIdx, setSelectedTimeIdx] = useState(0)
  const [postError, setPostError] = useState<string | null>(null)

  const hasInteracted = useRef(false)
  useEffect(() => {
    if (chatMessages.length > 1) hasInteracted.current = true
    if (hasInteracted.current) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 150)
    }
  }, [chatMessages, chatLoading, readyData, wantMore])

  async function sendMessage(text: string) {
    if (!text.trim() || chatLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim() }
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
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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

      // If we have times AND courses AND confirmed count, the round is ready to post
      if (data.times?.length > 0 && data.courses?.length > 0 && data.confirmed != null) {
        setReadyData({
          title: data.title || 'Golf round',
          times: data.times,
          courses: data.courses,
          confirmed: data.confirmed,
          openSpots: data.open_spots || 0,
        })
        setSelectedCourseId(null)
        setSelectedTimeIdx(0)
        setWantMore(data.open_spots > 0 ? true : null)
        setPostError(null)
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

  async function handleChatSend() {
    sendMessage(chatInput)
  }

  // Detect what quick-reply buttons to show based on last assistant message
  function getQuickReplies(): { label: string; value: string }[] {
    if (chatLoading || posting || readyData) return []
    const lastMsg = chatMessages[chatMessages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return []
    const text = lastMsg.content.toLowerCase()

    // Asking about player count (only on follow-up messages, not the greeting)
    if (chatMessages.length > 1 && /how many player|how many.*total|how many.*joining|how many.*confirmed|including you/i.test(text)) {
      return [
        { label: 'Just me', value: 'Just me' },
        { label: '2 of us', value: '2 of us' },
        { label: '3 of us', value: '3 of us' },
        { label: 'Full foursome', value: 'Full foursome, 4 players' },
        { label: 'Need a 4th', value: 'We have 3, need a 4th' },
      ]
    }

    // Asking about time of day
    if (/what time|morning.*afternoon|when.*thinking|time.*work|time.*prefer/i.test(text) && !/where|area|course|location/i.test(text)) {
      return [
        { label: 'Morning', value: 'Morning' },
        { label: 'Afternoon', value: 'Afternoon' },
        { label: 'Evening', value: 'Evening' },
        { label: 'Anytime', value: 'Anytime — I\'m flexible' },
      ]
    }

    // First message — suggest days
    if (chatMessages.length === 1) {
      const days: { label: string; value: string }[] = []
      const now = new Date()
      for (let i = 0; i < 5; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() + i)
        const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEEE')
        days.push({ label: dayName, value: dayName })
      }
      days.push({ label: 'This weekend', value: 'This weekend' })
      return days
    }

    // Asking about day/when
    if (/what day|when.*play|when.*work|which day|what.*available/i.test(text) && !/time|morning|afternoon/i.test(text)) {
      const days: { label: string; value: string }[] = []
      const now = new Date()
      for (let i = 0; i < 5; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() + i)
        const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEEE')
        days.push({ label: dayName, value: dayName })
      }
      days.push({ label: 'This weekend', value: 'This weekend' })
      return days
    }

    return []
  }

  const quickReplies = getQuickReplies()

  async function handlePostToTeetimes() {
    if (!userId || !readyData || posting) return
    setPosting(true)
    setPostError(null)

    try {
      const teeTime = readyData.times[selectedTimeIdx] || readyData.times[0]
      const course = selectedCourseId
        ? readyData.courses.find(c => c.id === selectedCourseId) || readyData.courses[0]
        : readyData.courses[0]

      const res = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: readyData.title,
          course_id: course.id && course.id.length > 10 ? course.id : null,
          tee_time: new Date(teeTime.dateTime).toISOString(),
          max_players: readyData.confirmed + (wantMore ? Math.max(readyData.openSpots, 1) : readyData.openSpots),
          confirmed_count: readyData.confirmed,
          description: [
            readyData.times.length > 1 ? `Flexible times: ${readyData.times.map(t => t.label).join(', ')}` : null,
            !course.id || course.id.length <= 10 ? `Course: ${course.name}` : null,
          ].filter(Boolean).join('\n') || null,
          organizer_id: userId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post')

      router.push('/calendar')
    } catch (err: any) {
      console.error('Post tee time error:', err)
      setPostError(err?.message || 'Failed to post. Please try again.')
    } finally {
      setPosting(false)
    }
  }


  return (
    <div className="h-[100dvh] bg-dark-950 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-2 pb-2 flex flex-col flex-1 min-h-0 w-full">

        {/* Sleft Caddie Chat */}
        <div className="bg-gradient-to-br from-dark-800 to-emerald-950/20 rounded-2xl border border-emerald-900/30 overflow-hidden shadow-xl shadow-emerald-900/10 flex flex-col flex-1 min-h-0">
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

                  {/* Show suggested courses — only when offering multiple options */}
                  {msg.role === 'assistant' && msg.courses && msg.courses.length > 1 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {msg.courses.map((c, j) => {
                        const tier = c.price_tier
                        const tierLabel = tier === 1 ? '$' : tier === 2 ? '$$' : tier === 3 ? '$$$' : tier === 4 ? '$$$$' : null
                        const tierColor = tier === 1 ? 'text-green-400' : tier === 2 ? 'text-emerald-400' : tier === 3 ? 'text-yellow-400' : tier === 4 ? 'text-orange-400' : ''
                        // Extract short name for quick reply (e.g., "Heritage Course" from "Ibis Golf & Country Club - Heritage Course")
                        const shortName = c.name.includes(' - ') ? c.name.split(' - ')[1] : c.name
                        return (
                          <button
                            key={j}
                            type="button"
                            onClick={() => { if (!chatLoading && !posting && !readyData && i === chatMessages.length - 1) sendMessage(shortName) }}
                            disabled={chatLoading || posting || !!readyData || i !== chatMessages.length - 1}
                            className="inline-flex items-center gap-1.5 bg-dark-700 border border-dark-600 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-emerald-900/30 hover:border-emerald-800/50 hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:bg-dark-700 disabled:hover:border-dark-600 disabled:hover:text-gray-300"
                          >
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {c.name}
                          </button>
                        )
                      })}
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
                <div className="space-y-3">
                  <p className="text-white font-medium text-sm">{readyData.title}</p>

                  {/* Selectable times */}
                  {readyData.times.length > 1 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Pick a time</label>
                      <div className="flex flex-wrap gap-2">
                        {readyData.times.slice(0, 4).map((t, i) => (
                          <button key={i} type="button" onClick={() => setSelectedTimeIdx(i)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              selectedTimeIdx === i
                                ? 'bg-emerald-600 text-white border border-emerald-500'
                                : 'bg-dark-700 text-gray-400 border border-dark-600 hover:border-emerald-700 hover:text-gray-200'
                            }`}>
                            <Calendar className="w-3 h-3" />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {readyData.times.length === 1 && (
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg font-medium border border-emerald-500">
                        <Calendar className="w-3 h-3" />
                        {readyData.times[0].label}
                      </span>
                    </div>
                  )}

                  {/* Selectable courses */}
                  <div>
                    {readyData.courses.length > 1 && (
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Pick a course</label>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {readyData.courses.map((c) => {
                        const isSelected = selectedCourseId ? selectedCourseId === c.id : readyData.courses[0]?.id === c.id
                        return (
                          <button key={c.id} type="button" onClick={() => setSelectedCourseId(c.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white border border-emerald-500'
                                : 'bg-dark-700 text-gray-400 border border-dark-600 hover:border-emerald-700 hover:text-gray-200'
                            }`}>
                            <MapPin className="w-3 h-3" />
                            {c.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Player summary */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {readyData.confirmed} confirmed{readyData.confirmed === 1 ? ' (just you)' : ` (you + ${readyData.confirmed - 1})`}
                      {(readyData.openSpots > 0 || wantMore) && (
                        <span className="text-emerald-400"> · {Math.max(readyData.openSpots, 1)} open spot{Math.max(readyData.openSpots, 1) !== 1 ? 's' : ''}</span>
                      )}
                    </span>
                  </div>
                  {readyData.openSpots === 0 && wantMore === null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Need more players?</span>
                      <button type="button" onClick={() => setWantMore(true)}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                        Yes
                      </button>
                      <button type="button" onClick={() => setWantMore(false)}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-dark-700 text-gray-400 border border-dark-600 hover:text-white transition-colors">
                        No, we&apos;re set
                      </button>
                    </div>
                  )}
                </div>

                {/* Post Button */}
                <div className="pt-1">
                  <button
                    onClick={handlePostToTeetimes}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30"
                  >
                    <Calendar className="w-4 h-4" />
                    Post to The Board
                  </button>
                </div>
              </div>
            )}

            {/* Posting spinner */}
            {posting && (
              <div className="bg-dark-900/80 rounded-2xl border border-emerald-800/40 p-6 flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-emerald-400 font-medium">Posting to The Board...</span>
              </div>
            )}

            {/* Post error */}
            {postError && !posting && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-4 py-3 rounded-xl">
                {postError}
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Replies */}
          {quickReplies.length > 0 && (
            <div className="px-5 pt-3 pb-0 bg-dark-900/40 border-t border-dark-700">
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((qr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(qr.value)}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 border border-dark-600 hover:bg-emerald-900/30 hover:text-emerald-400 hover:border-emerald-800/50 transition-colors"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input */}
          <div className={`px-5 py-3 ${quickReplies.length === 0 ? 'border-t border-dark-700' : ''} bg-dark-900/40 flex-shrink-0`}>
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
