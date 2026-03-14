'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Comment } from '@/lib/types'
import { Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface PostCommentsProps {
  postId: string
  userId: string | null
  onCountChange?: (postId: string, delta: number) => void
}

export function PostComments({ postId, userId, onCountChange }: PostCommentsProps) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const inputRef = useRef<HTMLInputElement>(null)

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [postId])

  useEffect(() => {
    // Auto-focus the input when the component mounts
    inputRef.current?.focus()
  }, [])

  async function fetchComments() {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (data) setComments(data as Comment[])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !newComment.trim() || submitting) return

    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: userId, post_id: postId, content: newComment.trim() })
      .select('*, profiles(*)')
      .single()

    if (!error && data) {
      setComments(prev => [...prev, data as Comment])
      setNewComment('')
      onCountChange?.(postId, 1)
    }
    setSubmitting(false)
  }

  async function handleDelete(commentId: string) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId))
      onCountChange?.(postId, -1)
    }
  }

  return (
    <div className="px-5 pb-4 border-t border-dark-700">
      {/* Comment list */}
      {loading ? (
        <div className="py-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-dark-700 animate-pulse" />
          <div className="h-3 w-32 bg-dark-700 rounded animate-pulse" />
        </div>
      ) : comments.length > 0 ? (
        <div className="py-3 space-y-3 max-h-64 overflow-y-auto">
          {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-2.5 group">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                {comment.profiles?.avatar_url ? (
                  <img
                    src={comment.profiles.avatar_url}
                    alt={comment.profiles.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-emerald-700 font-semibold text-[10px]">
                    {comment.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-dark-700 rounded-xl px-3 py-2">
                  <span className="text-xs font-semibold text-white">
                    {comment.profiles?.full_name || 'Unknown'}
                  </span>
                  <p className="text-sm text-gray-300 mt-0.5 break-words whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-1 px-1">
                  <span className="text-[10px] text-gray-600">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {userId === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[10px] text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-3 text-xs text-gray-600">No comments yet. Be the first!</p>
      )}

      {/* Add comment input */}
      {userId ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            maxLength={500}
            className="flex-1 bg-dark-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 border-0 outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="p-2 text-emerald-500 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <p className="py-2 text-xs text-gray-500">
          <a href="/login" className="text-emerald-400 hover:text-emerald-300">Log in</a> to comment.
        </p>
      )}
    </div>
  )
}
