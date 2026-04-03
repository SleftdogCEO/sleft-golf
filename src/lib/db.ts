// Client-side DB helper that proxies writes through the server API
// Fixes the issue where client-side Supabase writes hang indefinitely

async function dbFetch(body: Record<string, any>) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Database error')
  return json.data
}

export const db = {
  async insert(table: string, data: Record<string, any>) {
    const rows = await dbFetch({ action: 'insert', table, data })
    return rows?.[0] || null
  },

  async insertMany(table: string, data: Record<string, any>[]) {
    return dbFetch({ action: 'insert', table, data })
  },

  async upsert(table: string, data: Record<string, any>, onConflict?: string) {
    const rows = await dbFetch({ action: 'upsert', table, data, onConflict })
    return rows?.[0] || null
  },

  async update(table: string, data: Record<string, any>, match: Record<string, any>) {
    const rows = await dbFetch({ action: 'update', table, data, match })
    return rows?.[0] || null
  },

  async delete(table: string, match: Record<string, any>) {
    return dbFetch({ action: 'delete', table, match })
  },
}
