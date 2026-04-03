import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { title, course_id, tee_time, max_players, description, organizer_id } = body

    if (!title || !tee_time || !organizer_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create meetup - RLS policy checks auth.uid() = organizer_id
    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .insert({
        title,
        course_id: course_id || null,
        tee_time,
        max_players: max_players || 4,
        description: description || null,
        organizer_id,
      })
      .select()
      .single()

    if (meetupError) {
      console.error('Meetup insert error:', meetupError.message, meetupError.details, meetupError.hint)
      return NextResponse.json({ error: meetupError.message }, { status: 500 })
    }

    // Add organizer as attendee
    await supabase
      .from('meetup_attendees')
      .insert({ meetup_id: meetup.id, user_id: organizer_id })

    return NextResponse.json({ meetup })
  } catch (err: any) {
    console.error('Meetup POST unexpected error:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
