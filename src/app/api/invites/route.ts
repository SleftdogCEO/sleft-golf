import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/push'

// GET /api/invites?user_id=xxx — get pending invites for a user
// GET /api/invites?meetup_id=xxx — get invites for a meetup
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const userId = req.nextUrl.searchParams.get('user_id')
    const meetupId = req.nextUrl.searchParams.get('meetup_id')

    if (userId) {
      const { data, error } = await supabase
        .from('meetup_invites')
        .select('*, meetups(*, profiles(id, full_name, avatar_url), courses(*)), inviter:profiles!meetup_invites_inviter_id_fkey(id, full_name, avatar_url)')
        .eq('invitee_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data || [])
    }

    if (meetupId) {
      const { data, error } = await supabase
        .from('meetup_invites')
        .select('*, invitee:profiles!meetup_invites_invitee_id_fkey(id, full_name, avatar_url)')
        .eq('meetup_id', meetupId)
        .order('created_at', { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data || [])
    }

    return NextResponse.json({ error: 'user_id or meetup_id required' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/invites — create an invite
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { meetup_id, inviter_id, invitee_id } = await req.json()

    if (!meetup_id || !inviter_id || !invitee_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('meetup_invites')
      .upsert({ meetup_id, inviter_id, invitee_id, status: 'pending' }, { onConflict: 'meetup_id,invitee_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send push notification to invitee
    try {
      // Get inviter name and meetup details for the notification
      const { data: inviter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', inviter_id)
        .single()

      const { data: meetup } = await supabase
        .from('meetups')
        .select('title, tee_time')
        .eq('id', meetup_id)
        .single()

      const inviterName = inviter?.full_name?.split(' ')[0] || 'Someone'
      const roundInfo = meetup?.title || 'a round'

      await sendPushNotification(
        invitee_id,
        `${inviterName} invited you to play`,
        roundInfo,
        { url: '/calendar' }
      )
    } catch (pushErr) {
      // Push failure shouldn't block the invite
      console.warn('Push notification failed:', pushErr)
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}

// PATCH /api/invites — accept or decline an invite
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { id, status, invitee_id, meetup_id } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('meetup_invites')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // If accepted, add to meetup attendees
    if (status === 'accepted' && invitee_id && meetup_id) {
      await supabase
        .from('meetup_attendees')
        .upsert({ meetup_id, user_id: invitee_id }, { onConflict: 'meetup_id,user_id' })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
