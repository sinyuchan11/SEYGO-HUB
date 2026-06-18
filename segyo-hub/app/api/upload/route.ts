import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { canPost } from '@/lib/permissions'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// Detect the real image type from magic bytes, ignoring the client-supplied
// MIME. Returns the server-trusted mime + extension, or null if it is not one
// of the allowed image formats. This prevents uploading non-images (e.g. HTML/
// SVG/scripts) to a public bucket by spoofing file.type.
function detectImageType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' }
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  // GIF: "GIF87a" / "GIF89a"
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) {
    return { mime: 'image/gif', ext: 'gif' }
  }
  // WebP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }
  return null
}

export async function POST(request: Request) {
  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Permission check: must be allowed to post (member+ and not in timeout).
  // Mirrors the posts insert RLS via the shared canPost policy so the two
  // gates can't drift apart.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, timeout_until')
    .eq('id', user.id)
    .single()
  if (!profile || !canPost(profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Parse form data
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

  // 4. Validate by magic bytes — never trust the client-supplied MIME.
  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = detectImageType(buffer)
  if (!detected) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PNG, JPEG, GIF, or WebP.' },
      { status: 400 },
    )
  }

  // 5. Upload via service client, using the server-derived content type.
  const random = Math.random().toString(36).slice(2, 8)
  const path = `${user.id}/${Date.now()}-${random}.${detected.ext}`

  const svc = createServiceClient()
  const { error: uploadError } = await svc.storage
    .from('post-images')
    .upload(path, buffer, {
      contentType: detected.mime,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 6. Return public URL
  const { data: urlData } = svc.storage.from('post-images').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}
