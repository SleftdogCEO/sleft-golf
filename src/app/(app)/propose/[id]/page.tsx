'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Calendar, MapPin, Check, X, HelpCircle,
  Smartphone, Copy, Users, ChevronRight, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { useUser } from '@/hooks/use-user'

type Vote = {
  user_id: string
  vote: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles?: any
}

type TimeOption = {
  id: string
  date_time: string
  votes: Vote[]
}

type CourseOption = {
  id: string
  course_name: string
  course_id: string | null
  votes: Vote[]
}

type Proposal = {
  id: string
  title: string
  message: string | null
  status: string
  organizer_id: string
  confirmed_meetup_id: string | null
  created_at: string
  profiles?: { full_name: string; avatar_url: string | null }
}

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { userId, profile } = useUser()

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [timeOptions, setTimeOptions] = useState<TimeOption[]>([])
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const fetchProposal = useCallback(async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, profiles(*)')
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Error fetching proposal:', error)
      setLoading(false)
      return
    }
    setProposal(data)

    // Fetch time options with votes
    const { data: times } = await supabase
      .from('proposal_times')
      .select('id, date_time')
      .eq('proposal_id', id)
      .order('date_time')

    if (times) {
      const timesWithVotes: TimeOption[] = []
      for (const t of times) {
        const { data: votes } = await supabase
          .from('proposal_time_votes')
          .select('user_id, vote, profiles(full_name)')
          .eq('proposal_time_id', t.id)
        timesWithVotes.push({ ...t, votes: votes || [] })
      }
      setTimeOptions(timesWithVotes)
    }

    // Fetch course options with votes
    const { data: courses } = await supabase
      .from('proposal_courses')
      .select('id, course_name, course_id')
      .eq('proposal_id', id)

    if (courses) {
      const coursesWithVotes: CourseOption[] = []
      for (const c of courses) {
        const { data: votes } = await supabase
          .from('proposal_course_votes')
          .select('user_id, vote, profiles(full_name)')
          .eq('proposal_course_id', c.id)
        coursesWithVotes.push({ ...c, votes: votes || [] })
      }
      setCourseOptions(coursesWithVotes)
    }

    setLoading(false)
  }, [supabase, id])

  useEffect(() => {
    fetchProposal()
  }, [fetchProposal])

  async function voteTime(timeId: string, vote: string) {
    if (!userId) return

    const existing = timeOptions
      .find(t => t.id === timeId)
      ?.votes.find(v => v.user_id === userId)

    if (existing?.vote === vote) {
      // Remove vote
      await supabase
        .from('proposal_time_votes')
        .delete()
        .eq('proposal_time_id', timeId)
        .eq('user_id', userId)
    } else {
      // Upsert vote
      await supabase
        .from('proposal_time_votes')
        .upsert(
          { proposal_time_id: timeId, user_id: userId, vote },
          { onConflict: 'proposal_time_id,user_id' }
        )
    }
    await fetchProposal()
  }

  async function voteCourse(courseOptionId: string, vote: string) {
    if (!userId) return

    const existing = courseOptions
      .find(c => c.id === courseOptionId)
      ?.votes.find(v => v.user_id === userId)

    if (existing?.vote === vote) {
      await supabase
        .from('proposal_course_votes')
        .delete()
        .eq('proposal_course_id', courseOptionId)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('proposal_course_votes')
        .upsert(
          { proposal_course_id: courseOptionId, user_id: userId, vote },
          { onConflict: 'proposal_course_id,user_id' }
        )
    }
    await fetchProposal()
  }

  async function confirmRound(timeId: string, courseOptionId?: string) {
    if (!userId || !proposal) return
    setConfirming(true)

    const time = timeOptions.find(t => t.id === timeId)
    const course = courseOptionId ? courseOptions.find(c => c.id === courseOptionId) : null

    // Create the meetup
    const { data: meetup, error } = await supabase
      .from('meetups')
      .insert({
        title: proposal.title,
        tee_time: time!.date_time,
        course_id: course?.course_id || null,
        organizer_id: proposal.organizer_id,
        max_players: 8,
        description: proposal.message,
      })
      .select()
      .single()

    if (error || !meetup) {
      console.error('Error creating meetup:', error)
      setConfirming(false)
      return
    }

    // Add all voters who said "yes" as attendees
    const yesVoterIds = new Set<string>()
    yesVoterIds.add(proposal.organizer_id)
    for (const t of timeOptions) {
      for (const v of t.votes) {
        if (v.vote === 'yes') yesVoterIds.add(v.user_id)
      }
    }

    const attendeeRows = Array.from(yesVoterIds).map(uid => ({
      meetup_id: meetup.id,
      user_id: uid,
    }))

    await supabase.from('meetup_attendees').insert(attendeeRows)

    // Mark proposal as confirmed
    await supabase
      .from('proposals')
      .update({ status: 'confirmed', confirmed_meetup_id: meetup.id })
      .eq('id', proposal.id)

    setConfirming(false)
    router.push(`/tee-times/${meetup.id}`)
  }

  function shareLink() {
    const link = `https://sleftgolf.vercel.app/propose/${id}`
    const body = `Vote on when we should play golf! ${link}`

    if (navigator.share) {
      navigator.share({ title: proposal?.title || 'Golf Proposal', text: body, url: link })
        .catch(() => window.open(`sms:?&body=${encodeURIComponent(body)}`))
    } else {
      window.open(`sms:?&body=${encodeURIComponent(body)}`)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://sleftgolf.vercel.app/propose/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getMyVote(votes: { user_id: string; vote: string }[]) {
    return votes.find(v => v.user_id === userId)?.vote || null
  }

  function getVoteCounts(votes: { vote: string }[]) {
    return {
      yes: votes.filter(v => v.vote === 'yes').length,
      maybe: votes.filter(v => v.vote === 'maybe').length,
      no: votes.filter(v => v.vote === 'no').length,
    }
  }

  // Collect all unique voters
  function getAllVoters() {
    const voters = new Map<string, string>()
    for (const t of timeOptions) {
      for (const v of t.votes) {
        if (!voters.has(v.user_id)) {
          voters.set(v.user_id, (Array.isArray(v.profiles) ? v.profiles[0]?.full_name : v.profiles?.full_name) || 'Unknown')
        }
      }
    }
    for (const c of courseOptions) {
      for (const v of c.votes) {
        if (!voters.has(v.user_id)) {
          voters.set(v.user_id, (Array.isArray(v.profiles) ? v.profiles[0]?.full_name : v.profiles?.full_name) || 'Unknown')
        }
      }
    }
    return voters
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Proposal not found</h2>
          <Link href="/tee-times" className="text-emerald-400 hover:text-emerald-300">
            Back to tee times
          </Link>
        </div>
      </div>
    )
  }

  if (proposal.status === 'confirmed' && proposal.confirmed_meetup_id) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-emerald-900/50 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Round Confirmed!</h2>
          <p className="text-gray-400 text-sm mb-6">
            This proposal has been locked in. Head to the Match Room to coordinate.
          </p>
          <Link
            href={`/tee-times/${proposal.confirmed_meetup_id}`}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Go to Match Room
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const isOrganizer = userId === proposal.organizer_id
  const allVoters = getAllVoters()
  const bestTime = timeOptions.length > 0
    ? timeOptions.reduce((best, t) => {
        const yesCount = t.votes.filter(v => v.vote === 'yes').length
        const bestYes = best.votes.filter(v => v.vote === 'yes').length
        return yesCount > bestYes ? t : best
      })
    : null
  const bestCourse = courseOptions.length > 0
    ? courseOptions.reduce((best, c) => {
        const yesCount = c.votes.filter(v => v.vote === 'yes').length
        const bestYes = best.votes.filter(v => v.vote === 'yes').length
        return yesCount > bestYes ? c : best
      })
    : null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-lg mx-auto px-4 py-6">

        <Link
          href="/tee-times"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tee Times
        </Link>

        {/* Header */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{proposal.title}</h1>
          <p className="text-gray-500 text-sm mb-3">
            Proposed by {proposal.profiles?.full_name || 'Unknown'}
          </p>
          {proposal.message && (
            <p className="text-gray-300 text-sm mb-4">{proposal.message}</p>
          )}

          {/* Voters */}
          {allVoters.size > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-gray-400">
                {allVoters.size} vote{allVoters.size !== 1 ? 's' : ''}: {Array.from(allVoters.values()).join(', ')}
              </span>
            </div>
          )}

          {/* Share buttons */}
          <div className="flex gap-2">
            <button
              onClick={shareLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              Send to Group
            </button>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-dark-700 text-gray-300 hover:bg-dark-600 border border-dark-600 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Time Voting */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            When works?
          </h2>
          <div className="space-y-3">
            {timeOptions.map(time => {
              const myVote = getMyVote(time.votes)
              const counts = getVoteCounts(time.votes)
              const isBest = bestTime?.id === time.id && counts.yes > 0

              return (
                <div
                  key={time.id}
                  className={`bg-dark-800 rounded-xl border p-4 transition-colors ${
                    isBest ? 'border-emerald-600' : 'border-dark-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-medium">
                        {format(new Date(time.date_time), 'EEEE, MMM d')}
                      </p>
                      <p className="text-emerald-400 text-sm font-semibold">
                        {format(new Date(time.date_time), 'h:mm a')}
                      </p>
                    </div>
                    {isBest && (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-900/40 px-2 py-1 rounded-full">
                        Top pick
                      </span>
                    )}
                  </div>

                  {/* Vote buttons */}
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => voteTime(time.id, 'yes')}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        myVote === 'yes'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Yes {counts.yes > 0 && `(${counts.yes})`}
                    </button>
                    <button
                      onClick={() => voteTime(time.id, 'maybe')}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        myVote === 'maybe'
                          ? 'bg-amber-600 text-white'
                          : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      Maybe {counts.maybe > 0 && `(${counts.maybe})`}
                    </button>
                    <button
                      onClick={() => voteTime(time.id, 'no')}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        myVote === 'no'
                          ? 'bg-red-600 text-white'
                          : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      No {counts.no > 0 && `(${counts.no})`}
                    </button>
                  </div>

                  {/* Who voted */}
                  {time.votes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {time.votes.map(v => (
                        <span
                          key={v.user_id}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            v.vote === 'yes'
                              ? 'bg-emerald-900/40 text-emerald-400'
                              : v.vote === 'maybe'
                              ? 'bg-amber-900/40 text-amber-400'
                              : 'bg-red-900/40 text-red-400'
                          }`}
                        >
                          {(Array.isArray(v.profiles) ? v.profiles[0]?.full_name : v.profiles?.full_name)?.split(' ')[0] || '?'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Course Voting */}
        {courseOptions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              Where works?
            </h2>
            <div className="space-y-3">
              {courseOptions.map(course => {
                const myVote = getMyVote(course.votes)
                const counts = getVoteCounts(course.votes)
                const isBest = bestCourse?.id === course.id && counts.yes > 0

                return (
                  <div
                    key={course.id}
                    className={`bg-dark-800 rounded-xl border p-4 transition-colors ${
                      isBest ? 'border-emerald-600' : 'border-dark-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-medium">{course.course_name}</p>
                      {isBest && (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-900/40 px-2 py-1 rounded-full">
                          Top pick
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => voteCourse(course.id, 'yes')}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                          myVote === 'yes'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        Yes {counts.yes > 0 && `(${counts.yes})`}
                      </button>
                      <button
                        onClick={() => voteCourse(course.id, 'maybe')}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                          myVote === 'maybe'
                            ? 'bg-amber-600 text-white'
                            : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                        Maybe {counts.maybe > 0 && `(${counts.maybe})`}
                      </button>
                      <button
                        onClick={() => voteCourse(course.id, 'no')}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                          myVote === 'no'
                            ? 'bg-red-600 text-white'
                            : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        No {counts.no > 0 && `(${counts.no})`}
                      </button>
                    </div>

                    {course.votes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {course.votes.map(v => (
                          <span
                            key={v.user_id}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              v.vote === 'yes'
                                ? 'bg-emerald-900/40 text-emerald-400'
                                : v.vote === 'maybe'
                                ? 'bg-amber-900/40 text-amber-400'
                                : 'bg-red-900/40 text-red-400'
                            }`}
                          >
                            {(Array.isArray(v.profiles) ? v.profiles[0]?.full_name : v.profiles?.full_name)?.split(' ')[0] || '?'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Confirm Round (organizer only) */}
        {isOrganizer && bestTime && bestTime.votes.filter(v => v.vote === 'yes').length > 0 && (
          <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-2xl p-6 text-center">
            <h3 className="text-white font-semibold mb-1">Ready to lock it in?</h3>
            <p className="text-emerald-300 text-sm mb-4">
              Top pick: {format(new Date(bestTime.date_time), 'EEEE, MMM d \'at\' h:mm a')}
              {bestCourse ? ` at ${bestCourse.course_name}` : ''}
            </p>
            <button
              onClick={() => confirmRound(bestTime.id, bestCourse?.id)}
              disabled={confirming}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg"
            >
              {confirming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              Confirm This Round
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
