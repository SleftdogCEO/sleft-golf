'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/lib/types'
import { MapPin, Camera, Send, X, Search, ChevronDown } from 'lucide-react'
import { db } from '@/lib/db'

const VIBES = [
  { emoji: '🔥', label: 'On Fire' },
  { emoji: '😎', label: 'Solid' },
  { emoji: '💪', label: 'Grinder' },
  { emoji: '😅', label: 'Rough' },
  { emoji: '🍻', label: 'Vibes' },
]

interface QuickRoundPostProps {
  onPostCreated: () => void
}

export function QuickRoundPost({ onPostCreated }: QuickRoundPostProps) {
  const supabaseRef = useRef(createClient())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [courseSearch, setCourseSearch] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [score, setScore] = useState('')
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18)
  const [vibe, setVibe] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Check auth on mount
  useEffect(() => {
    const supabase = supabaseRef.current
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user?: { id: string } } | null } }) => {
      setUserId(session?.user?.id ?? null)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: { user?: { id: string } } | null) => {
      setUserId(session?.user?.id ?? null)
      setAuthChecked(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Course search
  useEffect(() => {
    if (courseSearch.length >= 2) {
      const timeout = setTimeout(() => {
        supabaseRef.current
          .from('courses')
          .select('*')
          .or(`name.ilike.%${courseSearch}%,parent_club.ilike.%${courseSearch}%,city.ilike.%${courseSearch}%`)
          .limit(6)
          .then(({ data }: { data: Course[] | null }) => { if (data) setCourses(data) })
      }, 200)
      return () => clearTimeout(timeout)
    } else {
      setCourses([])
    }
  }, [courseSearch])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleButtonClick() {
    if (!authChecked) return
    if (!userId) {
      router.push('/login?redirect=/feed')
      return
    }
    setExpanded(true)
  }

  async function handleSubmit() {
    if (!selectedCourse || !score || !userId) return
    setSubmitting(true)
    const supabase = supabaseRef.current

    try {
      const round = await db.insert('rounds', {
        user_id: userId,
        course_id: selectedCourse.id,
        score: parseInt(score),
        holes_played: holesPlayed,
        status: 'completed',
        tee_time: new Date().toISOString(),
      })

      if (!round) {
        console.error('Round creation failed')
        return
      }

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

      const vibeObj = vibe ? VIBES.find(v => v.emoji === vibe) : null
      const contentParts: string[] = []
      if (vibeObj) contentParts.push(`${vibeObj.emoji} ${vibeObj.label}`)
      if (note.trim()) contentParts.push(note.trim())
      const content = contentParts.join('\n') || null

      await db.insert('posts', {
        user_id: userId,
        round_id: round.id,
        content,
        image_urls: imageUrls,
      })

      setExpanded(false)
      setSelectedCourse(null)
      setCourseSearch('')
      setScore('')
      setHolesPlayed(18)
      setVibe(null)
      setNote('')
      clearImage()
      onPostCreated()
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={handleButtonClick}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-5 text-white text-left hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⛳</span>
            <div>
              <h3 className="text-lg font-bold">I Played!</h3>
              <p className="text-emerald-100 text-sm">
                {authChecked && !userId ? 'Sign up to post your rounds' : 'Post your round in seconds'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-emerald-200 group-hover:translate-y-0.5 transition-transform" />
        </div>
      </button>
    )
  }

  return (
    <div className="bg-dark-800 rounded-2xl shadow-lg border border-emerald-800/50 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⛳</span>
          <h3 className="font-bold text-white">Post a Round</h3>
        </div>
        <button onClick={() => setExpanded(false)} className="text-emerald-200 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Course Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Where&apos;d you play?</label>
          {selectedCourse ? (
            <div className="flex items-center justify-between bg-emerald-900/30 border border-emerald-700/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-medium text-emerald-300">
                  {selectedCourse.parent_club ? `${selectedCourse.parent_club} – ` : ''}
                  {selectedCourse.name}
                </span>
                {selectedCourse.par && (
                  <span className="text-xs text-gray-500 ml-1">Par {selectedCourse.par}</span>
                )}
              </div>
              <button
                onClick={() => { setSelectedCourse(null); setCourseSearch('') }}
                className="text-gray-400 hover:text-white"
              >
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
                placeholder="Search courses..."
                className="w-full pl-9 pr-3 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
              {courses.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-dark-700 border border-dark-600 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {courses.map(course => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course)
                        setCourseSearch('')
                        setCourses([])
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-dark-600 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="text-gray-100 font-medium">
                        {course.parent_club ? `${course.parent_club} – ` : ''}
                        {course.name}
                      </span>
                      {course.city && (
                        <span className="text-gray-500 text-sm ml-2">
                          {course.city}, {course.state}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Score + Holes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">What&apos;d you shoot?</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={score}
              onChange={e => setScore(e.target.value)}
              placeholder="--"
              min={holesPlayed === 9 ? '20' : '40'}
              max={holesPlayed === 9 ? '100' : '200'}
              className="w-24 text-center text-3xl font-black bg-dark-700 border border-dark-600 rounded-xl py-2 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500"
            />
            {/* 9/18 hole toggle */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex bg-dark-700 rounded-xl overflow-hidden border border-dark-600">
                {([9, 18] as const).map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHolesPlayed(h)}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      holesPlayed === h
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-gray-500">holes</span>
            </div>
            {score && selectedCourse?.par ? (() => {
              const effectivePar = holesPlayed === 9 ? Math.round(selectedCourse.par / 2) : selectedCourse.par
              const diff = parseInt(score) - effectivePar
              return (
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold px-3 py-1 rounded-full ${
                    diff < 0 ? 'bg-emerald-900/50 text-emerald-400' :
                    diff === 0 ? 'bg-emerald-900/50 text-emerald-400' :
                    diff <= 10 ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    {diff === 0 ? 'Even!' : diff < 0 ? `${diff}` : `+${diff}`}
                  </span>
                  <span className="text-xs text-gray-500">Par {effectivePar}</span>
                </div>
              )
            })() : null}
          </div>
        </div>

        {/* Vibe Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">How&apos;d it go?</label>
          <div className="flex gap-2">
            {VIBES.map(v => (
              <button
                key={v.emoji}
                type="button"
                onClick={() => setVibe(vibe === v.emoji ? null : v.emoji)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  vibe === v.emoji
                    ? 'bg-emerald-900/50 border-2 border-emerald-500 scale-105'
                    : 'bg-dark-700 border-2 border-transparent hover:border-dark-500'
                }`}
              >
                <span className="text-xl">{v.emoji}</span>
                <span className="text-[10px] text-gray-400 font-medium">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Note */}
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Quick note... (optional)"
          maxLength={140}
          className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500"
        />

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="max-h-32 rounded-xl object-cover" />
            <button
              onClick={clearImage}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
            >
              &times;
            </button>
          </div>
        )}

        {/* Photo + Submit */}
        <div className="flex items-center justify-between pt-1">
          <label className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-900/30">
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">Photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>
          <button
            onClick={handleSubmit}
            disabled={!selectedCourse || !score || submitting}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Posting...' : 'Post Round'}
          </button>
        </div>
      </div>
    </div>
  )
}
