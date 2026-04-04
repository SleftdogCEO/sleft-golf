'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { MapPin, Share2, Download } from 'lucide-react'
import type { Post } from '@/lib/types'
import { hapticMedium, hapticSuccess } from '@/lib/haptics'
import type { Milestone } from '@/lib/golf-milestones'

interface RoundRecapCardProps {
  post: Post
  onClose: () => void
}

export function RoundRecapCard({ post, onClose }: RoundRecapCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [milestones, setMilestones] = useState<Milestone[]>([])

  // Fetch milestones when card opens
  useEffect(() => {
    const round = post.rounds
    const course = round?.courses
    if (!round?.score || !post.user_id) return

    fetch('/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: post.user_id,
        score: round.score,
        course_id: round.course_id,
        course_name: course?.parent_club
          ? `${course.parent_club} - ${course.name}`
          : course?.name || 'the course',
        course_par: course?.par || 72,
      }),
    })
      .then(r => r.json())
      .then(data => setMilestones(data.milestones || []))
      .catch(() => {})
  }, [post])

  const round = post.rounds
  const course = round?.courses
  const profile = post.profiles
  const diff = round?.score != null && course?.par ? round.score - course.par : null

  // Extract vibe from content (first line may be "🔥 On Fire")
  const vibeMatch = post.content?.match(/^([🔥😎💪😅🍻])\s/)
  const vibe = vibeMatch ? vibeMatch[1] : null
  const caption = post.content
    ?.replace(/^[🔥😎💪😅🍻]\s[^\n]*\n?/, '')
    .trim()

  const dateStr = new Date(post.created_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return
    setSharing(true)
    hapticMedium()

    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: '#0b0f0e',
      })

      // Convert data URL to blob/file
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'sleft-golf-recap.png', { type: 'image/png' })

      // Try Web Share API with file (works on mobile Safari/Chrome and Capacitor WebView)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Round at ${course?.name || 'the course'}`,
          text: `Shot ${round?.score} at ${course?.name || 'the course'} on Sleft Golf!`,
        })
      } else {
        // Fallback: download the image
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = 'sleft-golf-recap.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      hapticSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('cancel') && !msg.includes('Cancel') && !msg.includes('abort') && !msg.includes('Abort')) {
        console.warn('Share failed:', msg)
      }
    } finally {
      setSharing(false)
    }
  }, [round, course])

  if (!round || round.score == null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* The shareable card (this div gets captured as the image) */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #111b17 0%, #0b0f0e 100%)' }}
        >
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-500" />

          <div className="p-6">
            {/* Player row */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center overflow-hidden ring-2 ring-emerald-500/30">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-emerald-400 font-bold text-lg">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base">
                  {profile?.full_name || 'Golfer'}
                </p>
                <p className="text-gray-500 text-xs">{dateStr}</p>
              </div>
              {vibe && <span className="text-2xl">{vibe}</span>}
            </div>

            {/* Big score */}
            <div className="text-center mb-6">
              <div className="text-8xl font-black text-white leading-none mb-2">
                {round.score}
              </div>
              {diff !== null && (
                <span
                  className={`inline-block text-base font-bold px-4 py-1.5 rounded-full ${
                    diff < 0
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : diff === 0
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : diff <= 10
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : 'bg-red-900/50 text-red-400'
                  }`}
                >
                  {diff === 0
                    ? 'Even Par'
                    : diff < 0
                      ? `${Math.abs(diff)} Under Par`
                      : `+${diff} Over Par`}
                </span>
              )}
            </div>

            {/* Milestones / Achievements */}
            {milestones.length > 0 && (
              <div className="mb-4 space-y-2">
                {milestones.slice(0, 2).map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-900/40 to-dark-800/40 rounded-xl px-4 py-2.5 border border-emerald-700/30"
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-emerald-400 font-bold text-sm">{m.headline}</p>
                      <p className="text-gray-400 text-xs">{m.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Course card */}
            <div className="bg-dark-800/60 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">
                    {course?.parent_club || course?.name || 'Unknown Course'}
                  </p>
                  {course?.parent_club && course?.name && (
                    <p className="text-emerald-400 text-xs font-medium">
                      {course.name}
                    </p>
                  )}
                  {course?.city && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {course.city}, {course.state}
                    </p>
                  )}
                </div>
                {course?.par && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide">
                      Par
                    </p>
                    <p className="text-white font-bold text-xl">{course.par}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Caption */}
            {caption && (
              <p className="text-gray-400 text-sm text-center mb-4">
                &ldquo;{caption}&rdquo;
              </p>
            )}

            {/* Sleft Golf branding */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-dark-700/40">
              <span className="text-sm">⛳</span>
              <span className="text-gray-600 text-[11px] font-semibold tracking-widest uppercase">
                Sleft Golf
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons (below the card, not captured in image) */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {sharing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share Recap
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-dark-800 text-gray-400 rounded-xl font-medium text-sm hover:text-white transition-colors border border-dark-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
