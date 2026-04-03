import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Meetup POST auth error:', authError?.message || 'No user')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { title, course_id, tee_time, max_players, description } = body

    if (!title || !tee_time) {
      return NextResponse.json({ error: 'Missing required fields: title, tee_time' }, { status: 400 })
    }

    // Create meetup
    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .insert({
        title,
        course_id: course_id || null,
        tee_time,
        max_players: max_players || 4,
        description: description || null,
        organizer_id: user.id,
      })
      .select()
      .single()

    if (meetupError) {
      console.error('Meetup insert error:', meetupError.message, meetupError.details, meetupError.hint)
      return NextResponse.json({ error: meetupError.message }, { status: 500 })
    }

    // Add organizer as attendee
    const { error: attendeeError } = await supabase
      .from('meetup_attendees')
      .insert({ meetup_id: meetup.id, user_id: user.id })

    if (attendeeError) {
      console.error('Attendee insert error:', attendeeError.message)
      // Non-fatal - meetup was created
    }

    return NextResponse.json({ meetup })
  } catch (err: any) {
    console.error('Meetup POST unexpected error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
