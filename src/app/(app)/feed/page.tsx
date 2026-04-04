'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Post, Profile, Course } from '@/lib/types'
import { Heart, MessageCircle, Image as ImageIcon, Send, MapPin, Share2, Search, X, Camera } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { GolfReactionPicker } from '@/components/golf-reactions'
import { GOLF_REACTIONS } from '@/lib/golf-reactions'
import { PostComments } from '@/components/post-comments'
import { useUser } from '@/hooks/use-user'
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/haptics'
import { sharePost } from '@/lib/native-share'
import { takePhoto, isNativePlatform } from '@/lib/native-camera'
import { RoundRecapCard } from '@/components/round-recap-card'
import { db } from '@/lib/db'

const VIBES = [
  { emoji: '\u{1F525}', label: 'On Fire' },
  { emoji: '\u{1F60E}', label: 'Solid' },
  { emoji: '\u{1F4AA}', label: 'Grinder' },
  { emoji: '\u{1F605}', label: 'Rough' },
  { emoji: '\u{1F37B}', label: 'Vibes' },
]

export default function FeedPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { userId, profile, loading: authLoading } = useUser()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [postReactions, setPostReactions] = useState<Record<string, Record<string, { count: number; reacted: boolean }>>>({})
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [useNativeCamera, setUseNativeCamera] = useState(false)
  const [recapPostId, setRecapPostId] = useState<string | null>(null)

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false)
  const [courseSearch, setCourseSearch] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [score, setScore] = useState('')
  const [vibe, setVibe] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [highlights, setHighlights] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  useEffect(() => { isNativePlatform().then(setUseNativeCamera) }, [])
  useEffect(() => { fetchPosts() }, [])
  useEffect(() => {
    if (profile) {
      fetchLikedPosts(profile.id)
      fetchReactions(profile.id)
    }
  }, [profile])

  // Course search
  useEffect(() => {
    if (courseSearch.length >= 2) {
      const timeout = setTimeout(() => {
        fetch(`/api/courses/search?q=${encodeURIComponent(courseSearch)}`)
          .then(r => r.json())
          .then(data => { if (data) setCourses(data as Course[]) })
          .catch(() => {})
      }, 200)
      return () => clearTimeout(timeout)
    } else {
      setCourses([])
    }
  }, [courseSearch])

  async function fetchLikedPosts(uid: string) {
    const { data } = await supabase.from('likes').select('post_id').eq('user_id', uid)
    if (data) setLikedPosts(new Set(data.map((l: { post_id: string }) => l.post_id)))
  }

  async function fetchPosts() {
    setLoading(true)
    try {
      const res = await fetch('/api/posts')
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        setPostError(`Feed error: ${body.error || res.statusText}`)
      } else {
        const data = await res.json()
        setPosts(data || [])
      }
    } catch (err: unknown) {
      setPostError(`Feed error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  async function fetchReactions(uid: string) {
    const { data } = await supabase.from('post_reactions').select('post_id, emoji, user_id')
    if (data) {
      const grouped: Record<string, Record<string, { count: number; reacted: boolean }>> = {}
      for (const r of data) {
        if (!grouped[r.post_id]) grouped[r.post_id] = {}
        if (!grouped[r.post_id][r.emoji]) grouped[r.post_id][r.emoji] = { count: 0, reacted: false }
        grouped[r.post_id][r.emoji].count++
        if (r.user_id === uid) grouped[r.post_id][r.emoji].reacted = true
      }
      setPostReactions(grouped)
    }
  }

  function getReactionsForPost(postId: string) {
    const reactions = postReactions[postId] || {}
    return GOLF_REACTIONS.map(r => ({
      emoji: r.emoji, label: r.label,
      count: reactions[r.emoji]?.count || 0,
      reacted: reactions[r.emoji]?.reacted || false,
    }))
  }

  async function toggleLike(postId: string) {
    if (!userId) { router.push('/login?redirect=/feed'); return }
    hapticLight()
    const isLiked = likedPosts.has(postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p))
    setLikedPosts(prev => { const next = new Set(prev); isLiked ? next.delete(postId) : next.add(postId); return next })
    if (isLiked) {
      await db.delete('likes', { user_id: userId, post_id: postId })
    } else {
      await db.insert('likes', { user_id: userId, post_id: postId })
    }
  }

  async function addReaction(postId: string, emoji: string) {
    if (!userId) { router.push('/login?redirect=/feed'); return }
    hapticMedium()
    setPostReactions(prev => {
      const next = { ...prev }
      if (!next[postId]) next[postId] = {}
      if (!next[postId][emoji]) next[postId][emoji] = { count: 0, reacted: false }
      next[postId][emoji] = { count: next[postId][emoji].count + 1, reacted: true }
      return next
    })
    await db.upsert('post_reactions', { post_id: postId, user_id: userId, emoji }, 'post_id,user_id,emoji')
  }

  async function removeReaction(postId: string, emoji: string) {
    if (!userId) { router.push('/login?redirect=/feed'); return }
    setPostReactions(prev => {
      const next = { ...prev }
      if (next[postId]?.[emoji]) next[postId][emoji] = { count: Math.max(0, next[postId][emoji].count - 1), reacted: false }
      return next
    })
    await db.delete('post_reactions', { post_id: postId, user_id: userId, emoji })
  }

  // Image handling
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleNativeImageSelect() {
    hapticLight()
    const photo = await takePhoto()
    if (!photo) return
    setImagePreview(photo.dataUrl)
    setImageFile(new File([photo.blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' }))
  }

  function clearImage() {
    setImagePreview(null)
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function resetComposer() {
    setComposerOpen(false)
    setSelectedCourse(null)
    setCourseSearch('')
    setScore('')
    setVibe(null)
    setCaption('')
    setHighlights('')
    clearImage()
    setPostError(null)
  }

  async function handleSubmitRound() {
    if (!userId || !selectedCourse || !score) return
    setSubmitting(true)
    setPostError(null)

    try {
      // Create round
      let round
      try {
        round = await db.insert('rounds', {
          user_id: userId,
          course_id: selectedCourse.id,
          score: parseInt(score),
          status: 'completed',
          tee_time: new Date().toISOString(),
        })
      } catch {
        setPostError('Failed to create round. Please try again.')
        setSubmitting(false)
        return
      }

      if (!round) {
        setPostError('Failed to create round. Please try again.')
        setSubmitting(false)
        return
      }

      // Upload image via server-side proxy (client-side Supabase storage hangs)
      let imageUrls: string[] = []
      if (imageFile) {
        const fileName = `${userId}/${Date.now()}-${imageFile.name}`
        try {
          const formData = new FormData()
          formData.append('file', imageFile)
          formData.append('bucket', 'posts')
          formData.append('path', fileName)
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
          if (uploadRes.ok) {
            const { publicUrl } = await uploadRes.json()
            if (publicUrl) imageUrls = [publicUrl]
          }
        } catch {
          // Image upload failed silently - still create the post without image
        }
      }

      // Save highlights to round notes if provided
      if (highlights.trim()) {
        await db.update('rounds', { notes: highlights.trim() }, { id: round.id })
      }

      // Build caption
      const vibeObj = vibe ? VIBES.find(v => v.emoji === vibe) : null
      const parts: string[] = []
      if (vibeObj) parts.push(`${vibeObj.emoji} ${vibeObj.label}`)
      if (caption.trim()) parts.push(caption.trim())
      if (highlights.trim()) parts.push(`Highlights: ${highlights.trim()}`)
      const content = parts.join('\n') || null

      // Create post
      await db.insert('posts', {
        user_id: userId,
        round_id: round.id,
        content,
        image_urls: imageUrls,
      })

      hapticSuccess()
      resetComposer()
      fetchPosts()
    } catch {
      setPostError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSharePost(post: Post) {
    hapticMedium()
    const authorName = post.profiles?.full_name || 'Someone'
    const text = post.content ? post.content.slice(0, 100) : 'Check out this post'
    await sharePost({ title: `${authorName} on Sleft Golf`, text, url: 'https://sleftgolf.vercel.app/feed' })
  }

  const scoreDiff = score && selectedCourse?.par ? parseInt(score) - selectedCourse.par : null

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Composer */}
        {!composerOpen ? (
          <button
            onClick={() => {
              if (!userId) { router.push('/login?redirect=/feed'); return }
              hapticLight()
              setComposerOpen(true)
            }}
            className="w-full mb-6 bg-dark-800 rounded-2xl border border-dark-700 p-4 flex items-center gap-3 hover:border-emerald-700/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-emerald-400 font-semibold text-sm">{profile?.full_name?.charAt(0)?.toUpperCase() || '+'}</span>
              )}
            </div>
            <span className="text-gray-500 text-sm">Post your round...</span>
            <Camera className="w-5 h-5 text-gray-600 ml-auto" />
          </button>
        ) : (
          <div className="mb-6 bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            {/* Composer header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">Post a Round</h3>
              <button onClick={resetComposer} className="text-gray-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {/* Course search */}
              {selectedCourse ? (
                <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-800/40 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">
                        {selectedCourse.parent_club ? `${selectedCourse.parent_club} - ` : ''}
                        {selectedCourse.name}
                      </p>
                      {selectedCourse.city && (
                        <p className="text-xs text-gray-500">{selectedCourse.city}, {selectedCourse.state}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedCourse(null); setCourseSearch('') }} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    placeholder="Search for a course..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                  {courses.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-dark-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {courses.map(course => (
                        <button
                          key={course.id}
                          onClick={() => { setSelectedCourse(course); setCourseSearch(''); setCourses([]) }}
                          className="w-full text-left px-4 py-3 hover:bg-dark-600 transition-colors first:rounded-t-xl last:rounded-b-xl flex items-center gap-3"
                        >
                          <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <div>
                            <span className="text-gray-100 text-sm font-medium">
                              {course.parent_club ? `${course.parent_club} - ` : ''}{course.name}
                            </span>
                            {course.city && (
                              <span className="text-gray-500 text-xs ml-2">{course.city}, {course.state}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Score input */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Score</label>
                  <input
                    type="number"
                    value={score}
                    onChange={e => setScore(e.target.value)}
                    placeholder="--"
                    min="40"
                    max="200"
                    className="w-24 text-center text-3xl font-black bg-dark-700 border border-dark-600 rounded-xl py-2.5 text-white placeholder-gray-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {scoreDiff !== null && !isNaN(scoreDiff) && (
                  <div className="pt-5">
                    <span className={`text-lg font-bold px-3 py-1.5 rounded-full ${
                      scoreDiff < 0 ? 'bg-emerald-900/50 text-emerald-400' :
                      scoreDiff === 0 ? 'bg-emerald-900/50 text-emerald-400' :
                      scoreDiff <= 10 ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {scoreDiff === 0 ? 'Even' : scoreDiff < 0 ? `${scoreDiff}` : `+${scoreDiff}`}
                    </span>
                    {selectedCourse?.par && <span className="text-xs text-gray-600 ml-2">Par {selectedCourse.par}</span>}
                  </div>
                )}
              </div>

              {/* Vibe selector */}
              <div className="flex gap-2">
                {VIBES.map(v => (
                  <button
                    key={v.emoji}
                    type="button"
                    onClick={() => { setVibe(vibe === v.emoji ? null : v.emoji); hapticLight() }}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all text-center ${
                      vibe === v.emoji
                        ? 'bg-emerald-900/40 ring-2 ring-emerald-500 scale-[1.03]'
                        : 'bg-dark-700 hover:bg-dark-600'
                    }`}
                  >
                    <span className="text-lg">{v.emoji}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{v.label}</span>
                  </button>
                ))}
              </div>

              {/* Caption */}
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                maxLength={280}
                className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 text-sm"
              />

              {/* Highlights (optional) */}
              <input
                type="text"
                value={highlights}
                onChange={e => setHighlights(e.target.value)}
                placeholder="Any highlights? e.g. birdie on 7, eagle on 14 (optional)"
                maxLength={200}
                className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 text-sm"
              />

              {/* Image preview */}
              {imagePreview && (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="max-h-40 rounded-xl object-cover" />
                  <button onClick={clearImage} className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80">
                    &times;
                  </button>
                </div>
              )}

              {postError && (
                <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-3 py-2 rounded-xl">
                  {postError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                {useNativeCamera ? (
                  <button onClick={handleNativeImageSelect} className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-900/20">
                    <Camera className="w-5 h-5" />
                    <span className="text-sm font-medium">Photo</span>
                  </button>
                ) : (
                  <label className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-900/20">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Photo</span>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                )}
                <button
                  onClick={handleSubmitRound}
                  disabled={!selectedCourse || !score || submitting}
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-dark-800 rounded-2xl border border-dark-700 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-dark-700" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-dark-700 rounded" />
                    <div className="h-3 w-16 bg-dark-700 rounded" />
                  </div>
                </div>
                <div className="h-20 w-full bg-dark-700 rounded-xl mb-3" />
                <div className="h-4 w-2/3 bg-dark-700 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{'\u26F3'}</div>
            <h3 className="text-lg font-semibold text-white mb-1">No rounds posted yet</h3>
            <p className="text-gray-500 text-sm">Be the first to share a round.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const round = post.rounds
              const course = round?.courses
              const diff = round?.score != null && course?.par ? round.score - course.par : null
              const hasImage = post.image_urls && post.image_urls.length > 0

              return (
                <div key={post.id} className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
                  {/* Post image (full-bleed at top if present) */}
                  {hasImage && (
                    <img
                      src={post.image_urls[0]}
                      alt="Round photo"
                      className="w-full max-h-80 object-cover"
                    />
                  )}

                  <div className="p-5">
                    {/* Author row */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt={post.profiles.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-emerald-400 font-semibold text-sm">
                            {post.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{post.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Round scorecard */}
                    {round && (
                      <div className="bg-dark-700/50 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">
                                {course?.parent_club ? `${course.parent_club} - ` : ''}
                                {course?.name || 'Unknown Course'}
                              </p>
                              {course?.city && (
                                <p className="text-xs text-gray-500">{course.city}, {course.state}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-black text-white leading-none">{round.score ?? '--'}</div>
                            {diff !== null && (
                              <span className={`text-xs font-bold ${
                                diff <= 0 ? 'text-emerald-400' : diff <= 10 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {diff === 0 ? 'Even par' : diff < 0 ? `${diff} under` : `+${diff} over`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Caption */}
                    {post.content && (
                      <p className="text-gray-200 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
                    )}

                    {/* Action bar */}
                    <div className="flex items-center gap-5 pt-2 border-t border-dark-700/50">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          likedPosts.has(post.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-[18px] h-[18px] ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                        {post.likes_count > 0 && <span>{post.likes_count}</span>}
                      </button>
                      <button
                        onClick={() => {
                          hapticLight()
                          setExpandedComments(prev => { const next = new Set(prev); next.has(post.id) ? next.delete(post.id) : next.add(post.id); return next })
                        }}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                          expandedComments.has(post.id) ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'
                        }`}
                      >
                        <MessageCircle className={`w-[18px] h-[18px] ${expandedComments.has(post.id) ? 'fill-current' : ''}`} />
                        {post.comments_count > 0 && <span>{post.comments_count}</span>}
                      </button>
                      {round && (
                        <button
                          onClick={() => { hapticLight(); setRecapPostId(post.id) }}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-emerald-400 transition-colors ml-auto"
                        >
                          <Share2 className="w-[18px] h-[18px]" />
                          <span>Recap</span>
                        </button>
                      )}
                      {!round && (
                        <button
                          onClick={() => handleSharePost(post)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-400 transition-colors ml-auto"
                        >
                          <Share2 className="w-[18px] h-[18px]" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Golf reactions */}
                  <div className="px-5 pb-4">
                    <GolfReactionPicker
                      reactions={getReactionsForPost(post.id)}
                      onReact={(r) => addReaction(post.id, r.emoji)}
                      onRemoveReaction={(emoji) => removeReaction(post.id, emoji)}
                    />
                  </div>

                  {/* Comments */}
                  {expandedComments.has(post.id) && (
                    <PostComments
                      postId={post.id}
                      userId={userId}
                      onCountChange={(pid, delta) => {
                        setPosts(prev => prev.map(p => p.id === pid ? { ...p, comments_count: p.comments_count + delta } : p))
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Round Recap Card modal */}
      {recapPostId && (() => {
        const recapPost = posts.find(p => p.id === recapPostId)
        return recapPost ? (
          <RoundRecapCard post={recapPost} onClose={() => setRecapPostId(null)} />
        ) : null
      })()}
    </div>
  )
}
