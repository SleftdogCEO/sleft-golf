'use client'

import { Flame, MapPin } from 'lucide-react'
import type { Post } from '@/lib/types'

type HotCourse = {
  course_id: string
  name: string
  parent_club: string | null
  city: string | null
  state: string | null
  round_count: number
  recent_players: string[]
}

export function HotCoursesWidget({ posts }: { posts: Post[] }) {
  const byCourse = new Map<string, {
    name: string
    parent_club: string | null
    city: string | null
    state: string | null
    count: number
    players: Set<string>
  }>()

  for (const post of posts) {
    if (!post.rounds?.courses) continue
    const course = post.rounds.courses
    const cid = course.id

    if (!byCourse.has(cid)) {
      byCourse.set(cid, {
        name: course.name,
        parent_club: course.parent_club,
        city: course.city,
        state: course.state,
        count: 0,
        players: new Set(),
      })
    }
    const entry = byCourse.get(cid)!
    entry.count++
    if (post.profiles) entry.players.add(post.profiles.full_name)
  }

  const courses: HotCourse[] = Array.from(byCourse.entries())
    .map(([course_id, data]) => ({
      course_id,
      name: data.name,
      parent_club: data.parent_club,
      city: data.city,
      state: data.state,
      round_count: data.count,
      recent_players: Array.from(data.players).slice(0, 3),
    }))
    .sort((a, b) => b.round_count - a.round_count)
    .slice(0, 5)

  if (!courses.length) return null

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
              <span className="text-lg flex-shrink-0">
                {i < 2 ? '🔥' : <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />}
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
