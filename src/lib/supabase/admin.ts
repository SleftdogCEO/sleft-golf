import { createClient } from '@supabase/supabase-js'

// Server-only admin client that bypasses RLS
// Only use in API routes for operations where cookie-based auth doesn't work
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
