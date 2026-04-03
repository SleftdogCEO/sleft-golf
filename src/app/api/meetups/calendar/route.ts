import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end params required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('meetups')
      .select('*, profiles(id, full_name, avatar_url, username, handicap, location), courses(*), meetup_attendees(*, profiles(id, full_name, avatar_url, username, handicap, location))')
      .gte('tee_time', start)
      .lte('tee_time', end)
      .order('tee_time', { ascending: true })

    if (error) {
      console.error('Calendar meetups error:', error.message, error.details)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('Calendar meetups unexpected error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
