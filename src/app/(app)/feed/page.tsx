'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post, Profile } from '@/lib/types'
import { Heart, MessageCircle, Image as ImageIcon, Send, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DailyDadJoke } from '@/components/daily-dad-joke'
import { GolfReactionPicker } from '@/components/golf-reactions'
import { GOLF_REACTIONS } from '@/lib/golf-reactions'
import { QuickRoundPost } from '@/components/quick-round-post'
import { LeaderboardWidget } from '@/components/leaderboard-widget'
import { HotCoursesWidget } from '@/components/hot-courses-widget'
import { useUser } from '@/hooks/use-user'

export default function FeedPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { userId, profile, loading: authLoading } = useUser()

  const [posts, setPosts] = useState<Post[]>([])
  const [newPostContent, setNewPostContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Profile | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [postReactions, setPostReactions] = useState<Record<string, Record<string, { count: number; reacted: boolean }>>>({})

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    if (profile) {
      setUser(profile)
      fetchLikedPosts(profile.id)
      fetchReactions(profile.id)
    }
  }, [profile])

  async function fetchLikedPosts(userId: string) {
    const { data } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId)

    if (data) {
      setLikedPosts(new Set(data.map((l: { post_id: string }) => l.post_id)))
    }
  }

  async function fetchPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(*), rounds(*, courses(*))')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching posts:', error)
    } else {
      setPosts(data || [])
    }
    setLoading(false)
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImagePreview(null)
    setImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSubmitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!user || (!newPostContent.trim() && !imageFile)) return

    setSubmitting(true)
    setPostError(null)
    let imageUrls: string[] = []

    try {
      if (imageFile) {
        const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, imageFile)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          setPostError('Photo failed to upload. Try again or post without the image.')
          setSubmitting(false)
          return
        } else {
          const { data: urlData } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName)
          imageUrls = [urlData.publicUrl]
        }
      }

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: newPostContent.trim() || null,
          image_urls: imageUrls,
        })
        .select('*, profiles(*), rounds(*, courses(*))')
        .single()

      if (error) {
        console.error('Error creating post:', error)
        setPostError('Failed to create post. Please try again.')
      } else if (newPost) {
        setPosts([newPost, ...posts])
        setNewPostContent('')
        clearImage()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function fetchReactions(userId: string) {
    const { data } = await supabase
      .from('post_reactions')
      .select('post_id, emoji, user_id')

    if (data) {
      const grouped: Record<string, Record<string, { count: number; reacted: boolean }>> = {}
      for (const r of data) {
        if (!grouped[r.post_id]) grouped[r.post_id] = {}
        if (!grouped[r.post_id][r.emoji]) grouped[r.post_id][r.emoji] = { count: 0, reacted: false }
        grouped[r.post_id][r.emoji].count++
        if (r.user_id === userId) grouped[r.post_id][r.emoji].reacted = true
      }
      setPostReactions(grouped)
    }
  }

  async function addReaction(postId: string, emoji: string) {
    if (!user) return
    setPostReactions(prev => {
      const next = { ...prev }
      if (!next[postId]) next[postId] = {}
      if (!next[postId][emoji]) next[postId][emoji] = { count: 0, reacted: false }
      next[postId][emoji] = { count: next[postId][emoji].count + 1, reacted: true }
      return next
    })
    await supabase.from('post_reactions').upsert(
      { post_id: postId, user_id: user.id, emoji },
      { onConflict: 'post_id,user_id,emoji' }
    )
  }

  async function removeReaction(postId: string, emoji: string) {
    if (!user) return
    setPostReactions(prev => {
      const next = { ...prev }
      if (next[postId]?.[emoji]) {
        next[postId][emoji] = { count: Math.max(0, next[postId][emoji].count - 1), reacted: false }
      }
      return next
    })
    await supabase.from('post_reactions').delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
  }

  function getReactionsForPost(postId: string) {
    const reactions = postReactions[postId] || {}
    return GOLF_REACTIONS.map(r => ({
      emoji: r.emoji,
      label: r.label,
      count: reactions[r.emoji]?.count || 0,
      reacted: reactions[r.emoji]?.reacted || false,
    }))
  }

  async function toggleLike(postId: string) {
    if (!user) return

    const isLiked = likedPosts.has(postId)

    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) }
          : p
      )
    )
    setLikedPosts(prev => {
      const next = new Set(prev)
      if (isLiked) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })

    if (isLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)
    } else {
      await supabase
        .from('likes')
        .insert({ user_id: user.id, post_id: postId })
    }
  }

  // Render a round scorecard inside a post
  function RoundCard({ post }: { post: Post }) {
    if (!post.rounds) return null
    const round = post.rounds
    const course = round.courses
    const diff = round.score != null && course?.par ? round.score - course.par : null

    return (
      <div className="bg-dark-700/60 rounded-xl p-4 mb-3">
        {/* Course name */}
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-3">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>
            {course?.parent_club ? `${course.parent_club} – ` : ''}
            {course?.name || 'Unknown Course'}
          </span>
        </div>

        {/* Score display */}
        <div className="flex items-center gap-3">
          <div className="text-4xl font-black text-white leading-none">
            {round.score ?? '--'}
          </div>
          {diff !== null && (
            <div className={`text-sm font-bold px-2.5 py-1 rounded-full ${
              diff < 0 ? 'bg-emerald-900/60 text-emerald-400' :
              diff === 0 ? 'bg-emerald-900/60 text-emerald-400' :
              diff <= 10 ? 'bg-yellow-900/60 text-yellow-400' :
              'bg-red-900/60 text-red-400'
            }`}>
              {diff === 0 ? 'Even par' : diff < 0 ? `${diff} under` : `+${diff} over`}
            </div>
          )}
          {course?.par && (
            <span className="text-xs text-gray-500">Par {course.par}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Feed</h1>

        {/* Quick Round Post — Primary CTA (handles its own auth) */}
        <div className="mb-4">
          <QuickRoundPost onPostCreated={fetchPosts} />
        </div>

        {/* Secondary: Text/Photo Post (compact) */}
        {(profile || user) && (
          <form
            onSubmit={handleSubmitPost}
            className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {(profile || user)?.avatar_url ? (
                  <img
                    src={(profile || user)!.avatar_url!}
                    alt={(profile || user)!.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-emerald-700 font-semibold text-xs">
                    {(profile || user)?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder="Share a thought..."
                className="flex-1 bg-dark-700 rounded-xl px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:bg-dark-600 transition-colors border-0"
              />
              <div className="flex items-center gap-1">
                <label className="p-2 text-gray-500 hover:text-emerald-400 cursor-pointer rounded-lg hover:bg-emerald-900/30 transition-colors">
                  <ImageIcon className="w-4 h-4" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting || (!newPostContent.trim() && !imageFile)}
                  className="p-2 text-emerald-500 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {imagePreview && (
              <div className="mt-3 ml-11 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                >
                  &times;
                </button>
              </div>
            )}

            {postError && (
              <div className="mt-2 ml-11 bg-red-900/30 border border-red-800/50 text-red-300 text-sm px-3 py-2 rounded-xl">
                {postError}
              </div>
            )}
          </form>
        )}

        {/* Daily Golf Joke */}
        <div className="mb-6">
          <DailyDadJoke variant="banner" />
        </div>

        {/* Leaderboard + Hot Courses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <LeaderboardWidget />
          <HotCoursesWidget />
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-dark-700" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-dark-700 rounded" />
                    <div className="h-3 w-16 bg-dark-700 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-dark-700 rounded mb-2" />
                <div className="h-4 w-2/3 bg-dark-700 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              No posts yet
            </h3>
            <p className="text-gray-400">
              Tap &quot;I Played!&quot; to post your first round!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div
                key={post.id}
                className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 overflow-hidden"
              >
                {/* Post Header */}
                <div className="p-5 pb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {post.profiles?.avatar_url ? (
                        <img
                          src={post.profiles.avatar_url}
                          alt={post.profiles.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-emerald-700 font-semibold text-sm">
                          {post.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">
                        {post.profiles?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {post.rounds && (
                      <span className="ml-auto text-xs font-medium text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full">
                        Round
                      </span>
                    )}
                  </div>

                  {/* Round Scorecard (for round-linked posts) */}
                  {post.rounds && <RoundCard post={post} />}

                  {/* Content */}
                  {post.content && (
                    <p className="text-gray-100 leading-relaxed mb-3 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  )}

                </div>

                {/* Post Image */}
                {post.image_urls && post.image_urls.length > 0 && (
                  <div className="mt-2">
                    <img
                      src={post.image_urls[0]}
                      alt="Post image"
                      className="w-full max-h-96 object-cover"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-3 flex items-center gap-6 border-t border-dark-700">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                      likedPosts.has(post.id)
                        ? 'text-red-500'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${likedPosts.has(post.id) ? 'fill-current' : ''}`}
                    />
                    {post.likes_count > 0 && post.likes_count}
                  </button>
                  <button className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    {post.comments_count > 0 && post.comments_count}
                  </button>
                </div>

                {/* Golf Reactions */}
                <div className="px-5 pb-4">
                  <GolfReactionPicker
                    reactions={getReactionsForPost(post.id)}
                    onReact={(r) => addReaction(post.id, r.emoji)}
                    onRemoveReaction={(emoji) => removeReaction(post.id, emoji)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
