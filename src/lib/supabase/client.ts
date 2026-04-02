import { createClient as supabaseCreateClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any> | undefined

function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

export function createClient() {
  if (typeof window === 'undefined') {
    // Server-side: use real Supabase URL directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabaseCreateClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const native = isCapacitor()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = supabaseCreateClient<any>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    native ? {
      auth: {
        // Disable auto-refresh in native -- it makes cross-origin calls that hang in WKWebView
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    } : undefined
  )
  return client
}
