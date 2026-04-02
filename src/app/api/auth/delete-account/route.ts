import { createClient } from '@/lib/supabase/server'
import { createClient as supabaseCreateClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  // Get the authenticated user via session cookies
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Use service role to delete the auth user (cascades to all profile data via FK)
  const adminSupabase = supabaseCreateClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  // Clear auth cookies
  const cookieStore = await cookies()
  cookieStore.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-')) {
      cookieStore.delete(cookie.name)
    }
  })

  return NextResponse.json({ success: true })
}
