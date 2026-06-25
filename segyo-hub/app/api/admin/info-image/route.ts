import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Detect the real image type from magic bytes — never trust client MIME.
function detectImageType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return { mime: 'image/png', ext: 'png' }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return { mime: 'image/gif', ext: 'gif' }
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return { mime: 'image/webp', ext: 'webp' }
  return null
}

export async function POST(request: Request) {
  // Auth + admin-only
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum 5 MB.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = detectImageType(buffer)
  if (!detected) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PNG, JPEG, GIF, or WebP.' },
      { status: 400 },
    )
  }

  const random = Math.random().toString(36).slice(2, 8)
  const path = `${Date.now()}-${random}.${detected.ext}`

  const svc = createServiceClient()
  const { error: uploadError } = await svc.storage
    .from('info-images')
    .upload(path, buffer, { contentType: detected.mime, cacheControl: '3600', upsert: false })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = svc.storage.from('info-images').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}
