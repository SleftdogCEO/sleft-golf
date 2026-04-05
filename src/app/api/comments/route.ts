import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const postId = req.nextUrl.searchParams.get('post_id')

    if (!postId) {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Comments fetch error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('Comments error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
