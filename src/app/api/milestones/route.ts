import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectMilestones } from '@/lib/golf-milestones'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { user_id, score, course_id, course_name, course_par } = await req.json()

    if (!user_id || score == null) {
      return NextResponse.json({ milestones: [] })
    }

    // Fetch user's round history
    const { data: history } = await supabase
      .from('rounds')
      .select('score, course_id, created_at, courses(par)')
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .not('score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)

    const historyRounds = (history || []).map((r: any) => ({
      score: r.score,
      course_id: r.course_id,
      course_par: r.courses?.par,
      created_at: r.created_at,
    }))

    const milestones = detectMilestones(
      { score, course_par: course_par || 72, course_name: course_name || 'the course' },
      historyRounds,
      course_id || null,
    )

    return NextResponse.json({ milestones })
  } catch (err: any) {
    console.error('Milestones error:', err?.message)
    return NextResponse.json({ milestones: [] })
  }
}
