// Detects brag-worthy milestones from a round and the user's history

export type Milestone = {
  type: 'personal_best' | 'course_record' | 'broke_threshold' | 'streak' | 'rounds_milestone' | 'comeback'
  emoji: string
  headline: string
  detail: string
}

type RoundData = {
  score: number
  course_par: number
  course_name: string
}

type HistoryRound = {
  score: number
  course_id: string | null
  course_par?: number
  created_at: string
}

export function detectMilestones(
  current: RoundData,
  history: HistoryRound[],
  currentCourseId: string | null,
): Milestone[] {
  const milestones: Milestone[] = []
  const { score, course_par, course_name } = current

  // Previous completed rounds (exclude the one just posted)
  const prevRounds = history.filter(r => r.score != null)
  const prevScores = prevRounds.map(r => r.score)

  // 1. Personal Best (overall)
  if (prevScores.length > 0 && score <= Math.min(...prevScores)) {
    milestones.push({
      type: 'personal_best',
      emoji: '🏆',
      headline: 'Personal Best',
      detail: prevScores.length === 0
        ? 'First round logged!'
        : `Beat your previous best of ${Math.min(...prevScores)}`,
    })
  }

  // 2. Course Record (best at this specific course)
  if (currentCourseId) {
    const courseRounds = prevRounds.filter(r => r.course_id === currentCourseId)
    const courseScores = courseRounds.map(r => r.score)
    if (courseScores.length > 0 && score < Math.min(...courseScores)) {
      milestones.push({
        type: 'course_record',
        emoji: '⛳',
        headline: `Best Round at ${course_name}`,
        detail: `Beat your previous best of ${Math.min(...courseScores)} here`,
      })
    }
  }

  // 3. Broke a threshold (first time under 70/80/90/100)
  const thresholds = [70, 80, 90, 100]
  for (const threshold of thresholds) {
    if (score < threshold) {
      const everBrokenBefore = prevScores.some(s => s < threshold)
      if (!everBrokenBefore) {
        milestones.push({
          type: 'broke_threshold',
          emoji: '🔥',
          headline: `Broke ${threshold}!`,
          detail: `Shot ${score} — first time under ${threshold}`,
        })
        break // Only show the most impressive threshold
      }
    }
  }

  // 4. Improvement streak (3+ rounds in a row getting better)
  if (prevRounds.length >= 2) {
    const recent = prevRounds
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(r => r.score)

    // Check if this round continues an improvement streak
    let streak = 1
    const withCurrent = [score, ...recent]
    for (let i = 0; i < withCurrent.length - 1; i++) {
      if (withCurrent[i] <= withCurrent[i + 1]) {
        streak++
      } else {
        break
      }
    }
    if (streak >= 3) {
      milestones.push({
        type: 'streak',
        emoji: '📈',
        headline: `${streak}-Round Hot Streak`,
        detail: `${streak} rounds in a row improving`,
      })
    }
  }

  // 5. Rounds milestone (10th, 25th, 50th, 100th round)
  const totalRounds = prevRounds.length + 1
  const roundMilestones = [10, 25, 50, 100, 200, 500]
  for (const m of roundMilestones) {
    if (totalRounds === m) {
      milestones.push({
        type: 'rounds_milestone',
        emoji: '💯',
        headline: `${m} Rounds Logged`,
        detail: `You just hit ${m} rounds on Sleft Golf`,
      })
    }
  }

  // 6. Score relative to par (only if impressive)
  const diff = score - course_par
  if (diff <= 0) {
    milestones.push({
      type: 'personal_best',
      emoji: diff < 0 ? '🦅' : '⛳',
      headline: diff === 0 ? 'Even Par' : `${Math.abs(diff)} Under Par`,
      detail: `Shot ${score} on a par ${course_par} course`,
    })
  }

  return milestones
}
