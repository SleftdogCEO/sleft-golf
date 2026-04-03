import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase.from('meetups').delete().eq('id', id)
    if (error) {
      console.error('Meetup delete error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Meetup DELETE error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase.from('meetups').update(updates).eq('id', id)
    if (error) {
      console.error('Meetup update error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Meetup PATCH error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { title, course_id, tee_time, max_players, description, organizer_id, confirmed_count } = body

    if (!title || !tee_time || !organizer_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .insert({
        title,
        course_id: course_id || null,
        tee_time,
        max_players: max_players || 4,
        description: description || null,
        organizer_id,
        confirmed_count: confirmed_count || 1,
      })
      .select()
      .single()

    if (meetupError) {
      console.error('Meetup insert error:', meetupError.message, meetupError.details)
      return NextResponse.json({ error: meetupError.message }, { status: 500 })
    }

    await supabase
      .from('meetup_attendees')
      .insert({ meetup_id: meetup.id, user_id: organizer_id })

    return NextResponse.json({ meetup })
  } catch (err: any) {
    console.error('Meetup POST error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
