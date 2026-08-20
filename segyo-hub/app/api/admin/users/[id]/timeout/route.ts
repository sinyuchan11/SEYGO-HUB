import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** 선택 가능한 정지 기간(시간). null 은 해제. */
const ALLOWED_HOURS = [1, 24, 72, 168] as const

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  const hours = body?.hours

  // 권한 판정은 mod_set_timeout(SECURITY DEFINER)이 하고, 여기선 입력만 좁힌다.
  const isClear = hours === null
  if (!isClear && !ALLOWED_HOURS.includes(hours)) {
    return NextResponse.json({ error: 'invalid hours' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const until = isClear ? null : new Date(Date.now() + hours * 3600_000).toISOString()
  const { error } = await supabase.rpc('mod_set_timeout', { target_id: id, until })
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })

  return NextResponse.json({ ok: true, until })
}
