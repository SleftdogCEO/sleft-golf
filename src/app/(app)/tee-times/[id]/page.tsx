'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Meetup, MeetupMessage, Profile } from '@/lib/types'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Users,
  Send,
  Copy,
  Check,
  CalendarPlus,
  MessageCircle,
  Flame,
  ChevronDown,
  Share2,
  Smartphone,
} from 'lucide-react'
import { format, formatDistanceToNow, isPast, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns'
import { WeatherWidget } from '@/components/weather-widget'
import { useUser } from '@/hooks/use-user'
import { db } from '@/lib/db'

export default function MatchRoomPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const { userId, profile } = useUser()

  const [meetup, setMeetup] = useState<Meetup | null>(null)
  const [messages, setMessages] = useState<MeetupMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')
  const [joining, setJoining] = useState(false)

  // Set user from auth profile
  useEffect(() => {
    if (profile) setUser(profile)
  }, [profile])

  // Fetch meetup
  const fetchMeetup = useCallback(async () => {
    const { data, error } = await supabase
      .from('meetups')
      .select('*, profiles(*), courses(*), meetup_attendees(*, profiles(*))')
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Error fetching meetup:', error)
      return
    }
    setMeetup(data)
    setLoading(false)
  }, [supabase, id])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('meetup_messages')
      .select('*, profiles(*)')
      .eq('meetup_id', id)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }, [supabase, id])

  useEffect(() => {
    fetchMeetup()
    fetchMessages()
  }, [fetchMeetup, fetchMessages])

  // Real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`meetup-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meetup_messages', filter: `meetup_id=eq.${id}` },
        async (payload: { new: { id: string } }) => {
          // Fetch the full message with profile
          const { data } = await supabase
            .from('meetup_messages')
            .select('*, profiles(*)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages(prev => [...prev, data])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetup_attendees', filter: `meetup_id=eq.${id}` },
        () => {
          fetchMeetup()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, id, fetchMeetup])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Countdown timer
  useEffect(() => {
    if (!meetup) return

    function updateCountdown() {
      const teeTime = new Date(meetup!.tee_time)
      const now = new Date()

      if (isPast(teeTime)) {
        setCountdown('Tee time!')
        return
      }

      const hours = differenceInHours(teeTime, now)
      const mins = differenceInMinutes(teeTime, now) % 60
      const secs = differenceInSeconds(teeTime, now) % 60

      if (hours > 24) {
        const days = Math.floor(hours / 24)
        setCountdown(`${days}d ${hours % 24}h ${mins}m`)
      } else if (hours > 0) {
        setCountdown(`${hours}h ${mins}m ${secs}s`)
      } else {
        setCountdown(`${mins}m ${secs}s`)
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [meetup])

  // Send message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newMessage.trim() || sending) return

    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    try {
      await db.insert('meetup_messages', {
        meetup_id: id,
        user_id: user.id,
        content,
      })
    } catch (err) {
      console.error('Error sending message:', err)
      setNewMessage(content) // restore on error
    }
    setSending(false)
  }

  // Join meetup
  async function handleJoin() {
    if (!user) return
    setJoining(true)
    try {
      await db.insert('meetup_attendees', { meetup_id: id, user_id: user.id })
      await fetchMeetup()
    } catch (err) {
      console.error('Error joining meetup:', err)
    }
    setJoining(false)
  }

  // Leave meetup
  async function handleLeave() {
    if (!user) return
    setJoining(true)
    try {
      await db.delete('meetup_attendees', { meetup_id: id, user_id: user.id })
      await fetchMeetup()
    } catch (err) {
      console.error('Error leaving meetup:', err)
    }
    setJoining(false)
  }

  // Copy to clipboard
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  // Generate .ics calendar file
  function downloadCalendarFile() {
    if (!meetup) return

    const teeTime = new Date(meetup.tee_time)
    const endTime = new Date(teeTime.getTime() + 4 * 60 * 60 * 1000) // 4 hours

    const formatDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

    const courseName = meetup.courses?.name || 'Golf Course'
    const club = meetup.courses?.parent_club ? `${meetup.courses.parent_club} - ` : ''
    const location = [
      club + courseName,
      meetup.courses?.city,
      meetup.courses?.state,
    ].filter(Boolean).join(', ')

    const players = meetup.meetup_attendees
      ?.map(a => a.profiles?.full_name)
      .filter(Boolean)
      .join(', ') || ''

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sleft Golf//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(teeTime)}`,
      `DTEND:${formatDate(endTime)}`,
      `SUMMARY:${meetup.title}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${meetup.title}\\nPlayers: ${players}\\n\\nOrganized on Sleft Golf`,
      `URL:https://sleftgolf.vercel.app/tee-times/${meetup.id}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meetup.title.replace(/[^a-zA-Z0-9]/g, '-')}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Invite via text message
  function inviteViaText() {
    if (!meetup) return
    const courseName = meetup.courses?.name || 'a round of golf'
    const time = format(new Date(meetup.tee_time), 'EEEE, MMM d \'at\' h:mm a')
    const link = `https://sleftgolf.vercel.app/tee-times/${meetup.id}`
    const body = `Hey! Join me for ${courseName} on ${time}. Tap to join: ${link}`

    // Try native share first (works great on mobile)
    if (navigator.share) {
      navigator.share({
        title: meetup.title,
        text: body,
        url: link,
      }).catch(() => {
        // Fallback to SMS
        window.open(`sms:?&body=${encodeURIComponent(body)}`)
      })
    } else {
      // Desktop fallback: open SMS URI
      window.open(`sms:?&body=${encodeURIComponent(body)}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!meetup) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Match not found</h2>
          <Link href="/tee-times" className="text-emerald-400 hover:text-emerald-300">
            Back to tee times
          </Link>
        </div>
      </div>
    )
  }

  const teeTime = new Date(meetup.tee_time)
  const isOver = isPast(teeTime)
  const attendees = meetup.meetup_attendees || []
  const isAttending = user && attendees.some(a => a.user_id === user.id)

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Back button */}
        <Link
          href="/tee-times"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Tee Times
        </Link>

        {/* Match Header Card */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden mb-6">
          {/* Countdown banner */}
          <div className={`px-6 py-4 ${
            isOver
              ? 'bg-dark-700'
              : 'bg-gradient-to-r from-emerald-900 to-emerald-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">
                  {isOver ? 'Match Complete' : 'Tee Time Countdown'}
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-white font-mono tracking-tight">
                  {countdown}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{format(teeTime, 'EEEE')}</p>
                <p className="text-emerald-200 text-sm">{format(teeTime, 'MMM d, yyyy')}</p>
                <p className="text-emerald-300 text-lg font-bold">{format(teeTime, 'h:mm a')}</p>
              </div>
            </div>
          </div>

          {/* Match details */}
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-1">{meetup.title}</h1>
            <p className="text-gray-500 text-sm mb-4">
              Organized by {meetup.profiles?.full_name || 'Unknown'}
            </p>

            {/* Course info */}
            {meetup.courses && (
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">
                  {meetup.courses.parent_club && (
                    <span className="text-gray-500">{meetup.courses.parent_club} &mdash; </span>
                  )}
                  {meetup.courses.name}
                </span>
                {meetup.courses.city && (
                  <span className="text-gray-500 text-sm">
                    {meetup.courses.city}, {meetup.courses.state}
                  </span>
                )}
              </div>
            )}

            {meetup.description && (
              <p className="text-gray-400 text-sm mt-3 whitespace-pre-wrap">{meetup.description}</p>
            )}

            {/* Join / Leave button */}
            {user && !isOver && (
              <div className="mt-4">
                {isAttending ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
                      <Check className="w-4 h-4" />
                      You&apos;re in
                    </span>
                    <button
                      onClick={handleLeave}
                      disabled={joining}
                      className="text-sm text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      Leave
                    </button>
                  </div>
                ) : attendees.length < meetup.max_players ? (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                  >
                    {joining ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    I&apos;m In
                  </button>
                ) : (
                  <span className="text-sm text-amber-400 font-medium">Group is full</span>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={inviteViaText}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Smartphone className="w-4 h-4" />
                Invite via Text
              </button>
              <button
                onClick={downloadCalendarFile}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 hover:text-white border border-dark-600 transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                Add to Calendar
              </button>
              <button
                onClick={() => copyToClipboard(`https://sleftgolf.vercel.app/tee-times/${meetup.id}`, 'link')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 hover:text-white border border-dark-600 transition-colors"
              >
                {copied === 'link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied === 'link' ? 'Copied!' : 'Share Link'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Chat */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Chat header */}
            <div className="bg-dark-800 rounded-t-2xl border border-dark-700 border-b-0 px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-900/50 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Match Chat</h2>
                <p className="text-gray-500 text-xs">
                  {messages.length} message{messages.length !== 1 ? 's' : ''} &middot; {attendees.length} player{attendees.length !== 1 ? 's' : ''}
                </p>
              </div>
              {!isOver && (
                <div className="ml-auto flex items-center gap-1.5 text-amber-400">
                  <Flame className="w-4 h-4" />
                  <span className="text-xs font-semibold">Talk trash</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="bg-dark-900/50 border-x border-dark-700 px-4 py-4 space-y-3 overflow-y-auto flex-1"
              style={{ minHeight: '400px', maxHeight: '600px' }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-14 h-14 rounded-full bg-emerald-900/30 flex items-center justify-center mb-3">
                    <Flame className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="text-gray-400 font-medium mb-1">No messages yet</p>
                  <p className="text-gray-600 text-sm">
                    Be the first to talk some trash or get the group hyped!
                  </p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.user_id === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2.5 max-w-[80%] ${isMe ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                          {msg.profiles?.avatar_url ? (
                            <img src={msg.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-300 text-xs font-semibold">
                              {msg.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>

                        {/* Bubble */}
                        <div>
                          <p className={`text-xs mb-1 ${isMe ? 'text-right' : ''} text-gray-500`}>
                            {msg.profiles?.full_name?.split(' ')[0] || 'Unknown'}
                            <span className="ml-2 text-gray-600">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                          </p>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-br-md'
                              : 'bg-dark-700 text-gray-200 rounded-bl-md'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message input */}
            {user && isAttending && (
              <form
                onSubmit={handleSend}
                className="bg-dark-800 rounded-b-2xl border border-dark-700 border-t-0 px-4 py-3 flex items-center gap-3"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={isOver ? 'Great round!' : "Talk trash, coordinate, get hype..."}
                  className="flex-1 bg-dark-700 border border-dark-600 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            )}

            {user && !isAttending && (
              <div className="bg-dark-800 rounded-b-2xl border border-dark-700 border-t-0 px-4 py-4 text-center">
                <p className="text-gray-500 text-sm">Join this match to chat with the group</p>
              </div>
            )}
          </div>

          {/* Right column: Players & Info */}
          <div className="space-y-4">
            {/* Players card */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-700">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Players ({attendees.length}/{meetup.max_players})
                </h3>
              </div>

              <div className="p-4 space-y-2">
                {attendees.map(attendee => (
                  <div
                    key={attendee.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-dark-500">
                      {attendee.profiles?.avatar_url ? (
                        <img src={attendee.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-300 text-sm font-semibold">
                          {attendee.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {attendee.profiles?.full_name || 'Unknown'}
                        {attendee.user_id === meetup.organizer_id && (
                          <span className="ml-1.5 text-xs text-emerald-400">(host)</span>
                        )}
                        {attendee.user_id === user?.id && (
                          <span className="ml-1.5 text-xs text-gray-500">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">@{attendee.profiles?.username}</p>
                    </div>
                  </div>
                ))}

                {/* Empty spots */}
                {Array.from({ length: meetup.max_players - attendees.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-3 p-2 opacity-40"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-dark-600 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-600 italic">Open spot</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weather card */}
            {meetup.courses?.lat && meetup.courses?.lng && !isOver && (
              <WeatherWidget
                lat={meetup.courses.lat}
                lng={meetup.courses.lng}
                courseName={meetup.courses.name}
                variant="compact"
              />
            )}

            {/* Match info card */}
            <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm">Match Details</h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>{format(teeTime, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>{format(teeTime, 'h:mm a')}</span>
                </div>
                {meetup.courses && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>
                      {meetup.courses.parent_club && `${meetup.courses.parent_club} - `}
                      {meetup.courses.name}
                    </span>
                  </div>
                )}
                {meetup.courses?.holes && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="w-4 h-4 flex items-center justify-center text-emerald-400 text-xs font-bold">
                      {meetup.courses.holes}
                    </span>
                    <span>{meetup.courses.holes} holes &middot; Par {meetup.courses.par}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-600 pt-2 border-t border-dark-700">
                Created {formatDistanceToNow(new Date(meetup.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
