import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const q = req.nextUrl.searchParams.get('q')
    const exclude = req.nextUrl.searchParams.get('exclude') // comma-separated user IDs to exclude

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, handicap')
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(8)

    if (exclude) {
      const ids = exclude.split(',').filter(Boolean)
      for (const id of ids) {
        query = query.neq('id', id)
      }
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
