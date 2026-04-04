import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Server-side file upload proxy for Supabase Storage
// Fixes the issue where client-side storage uploads hang indefinitely
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) || 'posts'
    const filePath = formData.get('path') as string

    if (!file || !filePath) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return NextResponse.json({ publicUrl: urlData.publicUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Upload proxy error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
