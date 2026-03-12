'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy } from 'lucide-react'

type LeaderboardEntry = {
  user_id: string
  full_name: string
  avatar_url: string | null
  rounds_played: number
  best_score: number
  avg_score: number
  best_diff: number | null
}

export function LeaderboardWidget() {
  const supabaseRef = useRef(createClient())
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const supabase = supabaseRef.current

        const { data: rounds, error } = await supabase
          .from('rounds')
          .select('user_id, score, courses(par), profiles(full_name, avatar_url)')
          .eq('status', 'completed')
          .not('score', 'is', null)
          .order('created_at', { ascending: false })
          .limit(200)

        if (error || !rounds?.length) { setLoading(false); return }

        const byUser = new Map<string, {
          full_name: string
          avatar_url: string | null
          scores: number[]
          diffs: number[]
        }>()

        for (const r of rounds) {
          const uid = r.user_id
          const profile = r.profiles as unknown as { full_name: string; avatar_url: string | null } | null
          if (!profile) continue

          if (!byUser.has(uid)) {
            byUser.set(uid, {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              scores: [],
              diffs: [],
            })
          }
          const entry = byUser.get(uid)!
          if (r.score != null) entry.scores.push(r.score)
          const courseObj = r.courses as unknown as { par: number } | null
          if (courseObj?.par && r.score != null) entry.diffs.push(r.score - courseObj.par)
        }

        const leaderboard: LeaderboardEntry[] = Array.from(byUser.entries())
          .map(([user_id, data]) => ({
            user_id,
            full_name: data.full_name,
            avatar_url: data.avatar_url,
            rounds_played: data.scores.length,
            best_score: Math.min(...data.scores),
            avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
            best_diff: data.diffs.length ? Math.min(...data.diffs) : null,
          }))
          .sort((a, b) => (a.best_diff ?? 999) - (b.best_diff ?? 999))
          .slice(0, 5)

        setEntries(leaderboard)
      } catch (err) {
        console.error('Leaderboard error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadLeaderboard()
  }, [])

  if (loading) {
    return (
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-5 animate-pulse">
        <div className="h-5 w-32 bg-dark-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-dark-700" />
              <div className="h-4 w-24 bg-dark-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

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
