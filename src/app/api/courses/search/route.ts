import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .or(`name.ilike.%${q}%,parent_club.ilike.%${q}%,city.ilike.%${q}%`)
    .limit(8)

  if (error) {
    console.error('Course search error:', error.message)
    return NextResponse.json([])
  }

  return NextResponse.json(data || [])
}
