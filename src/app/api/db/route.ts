import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Generic DB proxy for write operations
// Bypasses RLS since client-side Supabase auth cookies don't work in this app
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { action, table, data, match, onConflict } = await req.json()

    if (!action || !table) {
      return NextResponse.json({ error: 'Missing action or table' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'insert': {
        const { data: rows, error } = await supabase.from(table).insert(data).select()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        result = rows
        break
      }
      case 'upsert': {
        const { data: rows, error } = await supabase.from(table).upsert(data, onConflict ? { onConflict } : undefined).select()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        result = rows
        break
      }
      case 'update': {
        if (!match) return NextResponse.json({ error: 'Missing match for update' }, { status: 400 })
        let q: any = supabase.from(table).update(data)
        for (const [k, v] of Object.entries(match)) q = q.eq(k, v)
        const { data: rows, error } = await q.select()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        result = rows
        break
      }
      case 'delete': {
        if (!match) return NextResponse.json({ error: 'Missing match for delete' }, { status: 400 })
        let q: any = supabase.from(table).delete()
        for (const [k, v] of Object.entries(match)) q = q.eq(k, v)
        const { data: rows, error } = await q.select()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        result = rows
        break
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ data: result })
  } catch (err: any) {
    console.error('DB proxy error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
