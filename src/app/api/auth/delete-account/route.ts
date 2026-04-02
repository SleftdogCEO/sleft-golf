import { createClient as supabaseCreateClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Get access token from Authorization header (native) or cookies (web)
  let accessToken = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!accessToken) {
    // Try reading from cookies for web
    const cookieHeader = req.headers.get('cookie') || ''
    const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/)
    if (match) {
      try {
        const session = JSON.parse(decodeURIComponent(match[1]))
        accessToken = session?.access_token
      } catch {
        // Invalid cookie
      }
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Verify the token and get the user
  const adminSupabase = supabaseCreateClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: { user }, error: verifyError } = await adminSupabase.auth.getUser(accessToken)

  if (verifyError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  // Delete the auth user (cascades to all profile data via FK)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
