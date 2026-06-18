import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: Request) {
  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Role check: member+ only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role === 'pending' || profile.role === 'banned') {
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

  // 4. Validate type + size
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PNG, JPEG, GIF, or WebP.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum 5 MB.' },
      { status: 400 },
    )
  }

  // 5. Upload via service client
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const random = Math.random().toString(36).slice(2, 8)
  const path = `${user.id}/${Date.now()}-${random}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const svc = createServiceClient()
  const { error: uploadError } = await svc.storage
    .from('post-images')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // 6. Return public URL
  const { data: urlData } = svc.storage.from('post-images').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}
