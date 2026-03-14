'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, PlayerReview } from '@/lib/types'
import { X, Search, Star } from 'lucide-react'

interface PlayerReviewModalProps {
  userId: string
  onClose: () => void
}

const CATEGORIES = [
  { key: 'pace_rating' as const, label: 'Pace of Play', emoji: '🏃' },
  { key: 'etiquette_rating' as const, label: 'Etiquette', emoji: '🤝' },
  { key: 'fun_rating' as const, label: 'Fun Factor', emoji: '🎉' },
]

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= (hover || value)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export function PlayerReviewModal({ userId, onClose }: PlayerReviewModalProps) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [step, setStep] = useState<'search' | 'review'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Profile | null>(null)

  const [paceRating, setPaceRating] = useState(0)
  const [etiquetteRating, setEtiquetteRating] = useState(0)
  const [funRating, setFunRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [existingReview, setExistingReview] = useState<PlayerReview | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchPlayers(searchQuery), 300)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery])

  async function searchPlayers(query: string) {
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId)
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(8)

    if (data) setSearchResults(data as Profile[])
    setSearching(false)
  }

  async function selectPlayer(player: Profile) {
    setSelectedPlayer(player)
    setStep('review')

    // Check for existing review
    const { data } = await supabase
      .from('player_reviews')
      .select('*')
      .eq('reviewer_id', userId)
      .eq('reviewee_id', player.id)
      .single()

    if (data) {
      const review = data as PlayerReview
      setExistingReview(review)
      setPaceRating(review.pace_rating)
      setEtiquetteRating(review.etiquette_rating)
      setFunRating(review.fun_rating)
      setComment(review.comment || '')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlayer || !paceRating || !etiquetteRating || !funRating) {
      setError('Please rate all categories.')
      return
    }

    setSubmitting(true)
    setError('')

    const reviewData = {
      reviewer_id: userId,
      reviewee_id: selectedPlayer.id,
      pace_rating: paceRating,
      etiquette_rating: etiquetteRating,
      fun_rating: funRating,
      comment: comment.trim() || null,
    }

    let result
    if (existingReview) {
      result = await supabase
        .from('player_reviews')
        .update(reviewData)
        .eq('id', existingReview.id)
    } else {
      result = await supabase
        .from('player_reviews')
        .insert(reviewData)
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setSuccess(true)
      setTimeout(onClose, 1500)
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-white">
            {step === 'search' ? 'Review a Golfer' : `Review ${selectedPlayer?.full_name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">{'✅'}</div>
            <p className="text-white font-semibold">Review submitted!</p>
          </div>
        ) : step === 'search' ? (
          <div className="p-5">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                autoFocus
                className="w-full bg-dark-700 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 border-0 outline-none"
              />
            </div>

            {searching ? (
              <div className="py-8 text-center text-gray-500 text-sm">Searching...</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map(player => (
                  <button
                    key={player.id}
                    onClick={() => selectPlayer(player)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-dark-700 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-emerald-700 font-semibold text-sm">
                          {player.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{player.full_name}</p>
                      {player.username && (
                        <p className="text-xs text-gray-500 truncate">@{player.username}</p>
                      )}
                    </div>
                    {player.handicap != null && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-900/40 px-2 py-1 rounded-full">
                        {player.handicap}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="py-8 text-center text-gray-500 text-sm">No golfers found.</div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-sm">
                Search for a golfer to review.
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Player card */}
            <div className="flex items-center gap-3 bg-dark-700/50 rounded-xl p-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {selectedPlayer?.avatar_url ? (
                  <img src={selectedPlayer.avatar_url} alt={selectedPlayer.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-emerald-700 font-bold text-lg">
                    {selectedPlayer?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-white">{selectedPlayer?.full_name}</p>
                {selectedPlayer?.handicap != null && (
                  <p className="text-xs text-gray-400">Handicap: {selectedPlayer.handicap}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setStep('search'); setSelectedPlayer(null); setExistingReview(null); setPaceRating(0); setEtiquetteRating(0); setFunRating(0); setComment('') }}
                className="ml-auto text-xs text-gray-500 hover:text-white"
              >
                Change
              </button>
            </div>

            {existingReview && (
              <div className="bg-emerald-900/20 border border-emerald-800/30 text-emerald-300 text-xs px-3 py-2 rounded-xl">
                Updating your existing review.
              </div>
            )}

            {/* Rating categories */}
            <div className="space-y-4">
              {CATEGORIES.map(cat => (
                <div key={cat.key}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </label>
                  <StarRating
                    value={cat.key === 'pace_rating' ? paceRating : cat.key === 'etiquette_rating' ? etiquetteRating : funRating}
                    onChange={v => {
                      if (cat.key === 'pace_rating') setPaceRating(v)
                      else if (cat.key === 'etiquette_rating') setEtiquetteRating(v)
                      else setFunRating(v)
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Comment <span className="text-gray-600">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="How was playing with them?"
                rows={3}
                maxLength={500}
                className="w-full bg-dark-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 border-0 outline-none resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !paceRating || !etiquetteRating || !funRating}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// Compact review display card
export function ReviewCard({ review }: { review: PlayerReview }) {
  const avg = ((review.pace_rating + review.etiquette_rating + review.fun_rating) / 3).toFixed(1)

  return (
    <div className="bg-dark-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {review.reviewer?.avatar_url ? (
            <img src={review.reviewer.avatar_url} alt={review.reviewer.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-emerald-700 font-semibold text-xs">
              {review.reviewer?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{review.reviewer?.full_name || 'Unknown'}</p>
          <p className="text-[10px] text-gray-500">
            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-bold text-white">{avg}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-0.5">{'🏃'} Pace</div>
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= review.pace_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
            ))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-0.5">{'🤝'} Etiquette</div>
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= review.etiquette_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
            ))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-500 mb-0.5">{'🎉'} Fun</div>
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-3 h-3 ${s <= review.fun_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
            ))}
          </div>
        </div>
      </div>

      {review.comment && (
        <p className="text-sm text-gray-300 mt-2 italic">&ldquo;{review.comment}&rdquo;</p>
      )}
    </div>
  )
}
