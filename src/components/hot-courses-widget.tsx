'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Flame, MapPin } from 'lucide-react'

type HotCourse = {
  course_id: string
  name: string
  parent_club: string | null
  city: string | null
  state: string | null
  par: number | null
  round_count: number
  recent_players: string[]
}

export function HotCoursesWidget() {
  const supabaseRef = useRef(createClient())
  const [courses, setCourses] = useState<HotCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = supabaseRef.current

      // Get recent rounds with course + player info
      const { data: rounds } = await supabase
        .from('rounds')
        .select('course_id, courses(id, name, parent_club, city, state, par), profiles(full_name)')
        .eq('status', 'completed')
        .not('course_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!rounds?.length) { setLoading(false); return }

      const byCourse = new Map<string, {
        name: string
        parent_club: string | null
        city: string | null
        state: string | null
        par: number | null
        count: number
        players: Set<string>
      }>()

      for (const r of rounds) {
        const courseRaw = r.courses as unknown
        const course = (Array.isArray(courseRaw) ? courseRaw[0] : courseRaw) as { id: string; name: string; parent_club: string | null; city: string | null; state: string | null; par: number | null } | null
        const profileRaw = r.profiles as unknown
        const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { full_name: string } | null
        if (!course) continue

        if (!byCourse.has(course.id)) {
          byCourse.set(course.id, {
            name: course.name,
            parent_club: course.parent_club,
            city: course.city,
            state: course.state,
            par: course.par,
            count: 0,
            players: new Set(),
          })
        }
        const entry = byCourse.get(course.id)!
        entry.count++
        if (profile) entry.players.add(profile.full_name)
      }

      const hot: HotCourse[] = Array.from(byCourse.entries())
        .map(([course_id, data]) => ({
          course_id,
          name: data.name,
          parent_club: data.parent_club,
          city: data.city,
          state: data.state,
          par: data.par,
          round_count: data.count,
          recent_players: Array.from(data.players).slice(0, 3),
        }))
        .sort((a, b) => b.round_count - a.round_count)
        .slice(0, 5)

      setCourses(hot)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5 animate-pulse">
        <div className="h-5 w-32 bg-dark-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-dark-700 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!courses.length) return null

  // Fire intensity based on rank
  const fireColors = [
    'text-orange-400',
    'text-orange-400',
    'text-yellow-400',
    'text-yellow-500',
    'text-gray-400',
  ]

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600 to-red-500 px-5 py-3 flex items-center gap-2">
        <Flame className="w-5 h-5 text-white" />
        <h3 className="font-bold text-white text-sm">Hot Courses</h3>
      </div>
      <div className="p-4 space-y-1">
        {courses.map((course, i) => (
          <div key={course.course_id} className={`px-3 py-2.5 rounded-xl ${i === 0 ? 'bg-orange-900/15' : ''}`}>
            <div className="flex items-start gap-3">
              <span className={`text-lg flex-shrink-0 ${fireColors[i]}`}>
                {i === 0 ? '🔥' : i === 1 ? '🔥' : <MapPin className="w-4 h-4 mt-0.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {course.parent_club ? `${course.parent_club} – ` : ''}
                  {course.name}
                </p>
                {course.city && (
                  <p className="text-xs text-gray-500">{course.city}, {course.state}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {course.recent_players.slice(0, 2).join(', ')}
                  {course.recent_players.length > 2 && ` +${course.recent_players.length - 2} more`}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-bold text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded-full">
                  {course.round_count} round{course.round_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
