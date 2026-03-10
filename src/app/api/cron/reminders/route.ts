import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This runs daily via Vercel Cron (see vercel.json)
// Sends email reminders for meetups happening in the next 24 hours

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Get meetups with tee times in the next 24 hours
  const { data: meetups, error: meetupsError } = await supabase
    .from('meetups')
    .select(`
      *,
      courses (*),
      profiles!meetups_organizer_id_fkey (*),
      meetup_attendees (
        user_id
      )
    `)
    .gte('tee_time', now.toISOString())
    .lte('tee_time', tomorrow.toISOString())

  if (meetupsError || !meetups?.length) {
    return NextResponse.json({
      sent: 0,
      message: meetupsError ? meetupsError.message : 'No upcoming meetups',
    })
  }

  // Collect all user IDs who need reminders (organizers + attendees)
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
    if (user?.email) {
      emailMap.set(uid, user.email)
    }
  }

  if (!emailMap.size) {
    return NextResponse.json({ sent: 0, message: 'No user emails found' })
  }

  // Send reminder emails via Resend
  let sent = 0
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ sent: 0, message: 'RESEND_API_KEY not configured' })
  }

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
    const playerCount = (meetup.meetup_attendees?.length || 0) + 1 // +1 for organizer

    // Send to organizer + attendees
    const recipientIds = [meetup.organizer_id, ...(meetup.meetup_attendees || []).map((a: { user_id: string }) => a.user_id)]

    for (const uid of recipientIds) {
      const email = emailMap.get(uid)
      if (!email) continue

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Sleft Golf <onboarding@resend.dev>',
            to: email,
            subject: `⛳ Tee Time Tomorrow: ${courseName}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <div style="background: linear-gradient(135deg, #059669, #0d9488); border-radius: 16px; padding: 32px; color: white; text-align: center; margin-bottom: 24px;">
                  <div style="font-size: 48px; margin-bottom: 8px;">⛳</div>
                  <h1 style="margin: 0 0 4px; font-size: 22px;">You&apos;re Teeing Off Tomorrow!</h1>
                  <p style="margin: 0; opacity: 0.85; font-size: 14px;">Don&apos;t forget to pack your bag</p>
                </div>
                <div style="background: #1a1a2e; border-radius: 12px; padding: 20px; color: #e5e5e5;">
                  <p style="margin: 0 0 12px; font-size: 14px;">
                    <span style="color: #6ee7b7;">📍</span>
                    <strong>${courseName}</strong>
                  </p>
                  <p style="margin: 0 0 12px; font-size: 14px;">
                    <span style="color: #6ee7b7;">🕐</span>
                    ${timeStr}
                  </p>
                  <p style="margin: 0; font-size: 14px;">
                    <span style="color: #6ee7b7;">👥</span>
                    ${playerCount} player${playerCount > 1 ? 's' : ''}
                  </p>
                </div>
                <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #888;">
                  Sleft Golf — See you on the course
                </p>
              </div>
            `,
          }),
        })

        if (res.ok) sent++
      } catch (err) {
        console.error(`Failed to send reminder to ${email}:`, err)
      }
    }
  }

  return NextResponse.json({ sent, meetups: meetups.length })
}
