import { createClient as supabaseCreateClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any> | undefined

const STORAGE_KEY = 'sb-ujlafipkcptwjtsnydcy-auth-token'

function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

export function createClient() {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabaseCreateClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (isCapacitor()) {
    // Native: bypass all Supabase auth internals (they make cross-origin calls that hang in WKWebView)
    // Inject the access token into every request via custom fetch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = supabaseCreateClient<any>(url, key, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
              const session = JSON.parse(raw)
              if (session?.access_token) {
                init = init || {}
                const headers = new Headers(init.headers)
                headers.set('Authorization', `Bearer ${session.access_token}`)
                init.headers = headers
              }
            }
          } catch {
            // No stored session
          }
          return fetch(input, init)
        },
      },
    })
  } else {
    // Web: default Supabase behavior (cookies/localStorage work normally)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = supabaseCreateClient<any>(url, key)
  }

  return client
}
