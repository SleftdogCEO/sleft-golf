import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Two Vercel Cron entries hit this route with different ?type= params:
//   night_before (0:00 UTC / 8 PM ET) — "Pack your bag" for tomorrow's tee times
//   morning_of   (12:00 UTC / 8 AM ET) — "Game day!" + schedules 1-hour-before via Resend

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type') || 'morning_of'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const now = new Date()
  let windowStart: Date
  let windowEnd: Date

  if (type === 'night_before') {
    // 8 PM ET: catch meetups 8–24 hours from now (next morning through afternoon)
    windowStart = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  } else {
    // 8 AM ET: catch meetups 0–14 hours from now (rest of today)
    windowStart = now
    windowEnd = new Date(now.getTime() + 14 * 60 * 60 * 1000)
  }

  const { data: meetups, error: meetupsError } = await supabase
    .from('meetups')
    .select(`
      *,
      courses (*),
      profiles!meetups_organizer_id_fkey (*),
      meetup_attendees (user_id)
    `)
    .gte('tee_time', windowStart.toISOString())
    .lte('tee_time', windowEnd.toISOString())

  if (meetupsError || !meetups?.length) {
    return NextResponse.json({
      sent: 0,
      type,
      message: meetupsError ? meetupsError.message : 'No upcoming meetups in window',
    })
  }

  // Collect all user IDs (organizers + attendees)
  const userIds = new Set<string>()
  for (const meetup of meetups) {
    userIds.add(meetup.organizer_id)
    for (const att of meetup.meetup_attendees || []) {
      userIds.add(att.user_id)
    }
  }

  // Get emails from auth.users via admin API
  const emailMap = new Map<string, string>()
  for (const uid of userIds) {
    const { data: { user } } = await supabase.auth.admin.getUserById(uid)
    if (user?.email) emailMap.set(uid, user.email)
  }

  if (!emailMap.size) {
    return NextResponse.json({ sent: 0, type, message: 'No user emails found' })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ sent: 0, type, message: 'RESEND_API_KEY not configured' })
  }

  let sent = 0

  for (const meetup of meetups) {
    const courseName = meetup.courses?.parent_club
      ? `${meetup.courses.parent_club} – ${meetup.courses.name}`
      : meetup.courses?.name || 'TBD'
    const teeTime = new Date(meetup.tee_time)
    const timeStr = teeTime.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    })
    const playerCount = (meetup.meetup_attendees?.length || 0) + 1

    const recipientIds = [
      meetup.organizer_id,
      ...(meetup.meetup_attendees || []).map((a: { user_id: string }) => a.user_id),
    ]

    // Pick copy based on reminder type
    let subject: string
    let heading: string
    let subheading: string
    let icon: string

    if (type === 'night_before') {
      subject = `🌙 Tomorrow: ${courseName}`
      heading = "You're Playing Tomorrow!"
      subheading = 'Pack your bag tonight'
      icon = '🌙'
    } else {
      subject = `⛳ Game Day: ${courseName}`
      heading = 'Game Day!'
      subheading = "Let's get after it"
      icon = '⛳'
    }

    for (const uid of recipientIds) {
      const email = emailMap.get(uid)
      if (!email) continue

      // Send the main reminder (night-before or morning-of)
      sent += await sendEmail(resendKey, email, subject, icon, heading, subheading, courseName, timeStr, playerCount)

      // On the morning run, also schedule a "1 hour before" email
      if (type === 'morning_of') {
        const oneHourBefore = new Date(teeTime.getTime() - 60 * 60 * 1000)
        if (oneHourBefore > now) {
          sent += await sendEmail(
            resendKey,
            email,
            `🏌️ 1 Hour Until Tee Time: ${courseName}`,
            '🏌️',
            'Almost Tee Time!',
            'Head to the course — you tee off in an hour',
            courseName,
            timeStr,
            playerCount,
            oneHourBefore.toISOString(), // scheduled_at
          )
        }
      }
    }
  }

  return NextResponse.json({ sent, type, meetups: meetups.length })
}

async function sendEmail(
  resendKey: string,
  to: string,
  subject: string,
  icon: string,
  heading: string,
  subheading: string,
  courseName: string,
  timeStr: string,
  playerCount: number,
  scheduledAt?: string,
): Promise<number> {
  try {
    const body: Record<string, unknown> = {
      from: 'Sleft Golf <onboarding@resend.dev>',
      to,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #059669, #0d9488); border-radius: 16px; padding: 32px; color: white; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 8px;">${icon}</div>
            <h1 style="margin: 0 0 4px; font-size: 22px;">${heading}</h1>
            <p style="margin: 0; opacity: 0.85; font-size: 14px;">${subheading}</p>
          </div>
          <div style="background: #1a1a2e; border-radius: 12px; padding: 20px; color: #e5e5e5;">
            <p style="margin: 0 0 12px; font-size: 14px;">
              <span style="color: #6ee7b7;">📍</span> <strong>${courseName}</strong>
            </p>
            <p style="margin: 0 0 12px; font-size: 14px;">
              <span style="color: #6ee7b7;">🕐</span> ${timeStr}
            </p>
            <p style="margin: 0; font-size: 14px;">
              <span style="color: #6ee7b7;">👥</span> ${playerCount} player${playerCount > 1 ? 's' : ''}
            </p>
          </div>
          <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #888;">
            Sleft Golf — See you on the course
          </p>
        </div>
      `,
    }

    if (scheduledAt) {
      body.scheduled_at = scheduledAt
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    return res.ok ? 1 : 0
  } catch (err) {
    console.error(`Failed to send reminder to ${to}:`, err)
    return 0
  }
}
