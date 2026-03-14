import { createClient as supabaseCreateClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any> | undefined

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
  // Client-side: proxy through same domain to bypass ad blockers
  // Next.js rewrites /supabase/* -> supabase.co/*
  const proxyUrl = `${window.location.origin}/supabase`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = supabaseCreateClient<any>(
    proxyUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
