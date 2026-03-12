'use client'

import { Trophy } from 'lucide-react'
import type { Post } from '@/lib/types'

type LeaderboardEntry = {
  user_id: string
  full_name: string
  avatar_url: string | null
  rounds_played: number
  best_score: number
  best_diff: number | null
}

export function LeaderboardWidget({ posts }: { posts: Post[] }) {
  const byUser = new Map<string, {
    full_name: string
    avatar_url: string | null
    scores: number[]
    diffs: number[]
  }>()

  for (const post of posts) {
    if (!post.rounds || post.rounds.score == null || !post.profiles) continue
    const uid = post.user_id

    if (!byUser.has(uid)) {
      byUser.set(uid, {
        full_name: post.profiles.full_name,
        avatar_url: post.profiles.avatar_url,
        scores: [],
        diffs: [],
      })
    }
    const entry = byUser.get(uid)!
    entry.scores.push(post.rounds.score)
    const par = post.rounds.courses?.par
    if (par) entry.diffs.push(post.rounds.score - par)
  }

  const entries: LeaderboardEntry[] = Array.from(byUser.entries())
    .map(([user_id, data]) => ({
      user_id,
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      rounds_played: data.scores.length,
      best_score: Math.min(...data.scores),
      best_diff: data.diffs.length ? Math.min(...data.diffs) : null,
    }))
    .sort((a, b) => (a.best_diff ?? 999) - (b.best_diff ?? 999))
    .slice(0, 5)

  if (!entries.length) return null

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-600 to-yellow-500 px-5 py-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-white" />
        <h3 className="font-bold text-white text-sm">Leaderboard</h3>
      </div>
      <div className="p-4 space-y-1">
        {entries.map((entry, i) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
              i === 0 ? 'bg-amber-900/20' : ''
            }`}
          >
            <span className="text-lg w-7 text-center flex-shrink-0">
              {i < 3 ? medals[i] : <span className="text-gray-500 text-sm font-bold">{i + 1}</span>}
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt={entry.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-emerald-700 font-semibold text-xs">
                  {entry.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{entry.full_name}</p>
              <p className="text-xs text-gray-500">{entry.rounds_played} round{entry.rounds_played !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-white">{entry.best_score}</p>
              {entry.best_diff !== null && (
                <p className={`text-xs font-medium ${
                  entry.best_diff < 0 ? 'text-emerald-400' :
                  entry.best_diff === 0 ? 'text-emerald-400' :
                  entry.best_diff <= 10 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {entry.best_diff === 0 ? 'E' : entry.best_diff < 0 ? entry.best_diff.toString() : `+${entry.best_diff}`}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
