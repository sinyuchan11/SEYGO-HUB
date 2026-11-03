import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { WINDOW_MS, formatRetryAfter, loginLimitState, normalizeEmail } from '@/lib/loginLimit'

// 로그인은 이 라우트로만 한다. 브라우저에서 signInWithPassword 를 바로 부르면
// 실패 횟수를 셀 곳이 없다. (proxy.ts 는 /api/auth 를 그대로 통과시킨다.)
//
// 성공하면 createClient() 의 setAll 이 세션 쿠키를 응답에 실어 보내므로
// 클라이언트는 그대로 / 로 이동하면 된다.

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 })
  }
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력해 주세요.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const since = new Date(Date.now() - WINDOW_MS).toISOString()

  const { data: rows, error: readError } = await admin
    .from('login_failures')
    .select('created_at')
    .eq('email', email)
    .gt('created_at', since)
  if (readError) {
    // 기록을 못 읽으면 제한을 걸 수 없다. 조용히 통과시키지 말고 막는다.
    console.error('[login] read login_failures failed:', readError.message)
    return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 503 })
  }

  const before = loginLimitState((rows ?? []).map((r) => Date.parse(r.created_at)), Date.now())
  if (before.locked) {
    return NextResponse.json(
      {
        error: `로그인을 5번 실패해서 잠겼어요. ${formatRetryAfter(before.retryAfterSec)} 뒤에 다시 시도해 주세요.`,
        locked: true,
        retryAfterSec: before.retryAfterSec,
      },
      { status: 429, headers: { 'Retry-After': String(before.retryAfterSec) } },
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (!error) {
    await admin.from('login_failures').delete().eq('email', email)
    return NextResponse.json({ ok: true })
  }

  // 비밀번호 오류만 센다. Supabase 쪽 장애나 레이트리밋까지 세면 맞는 비밀번호로도 잠긴다.
  const isBadCredentials = error.code === 'invalid_credentials' || error.status === 400
  if (!isBadCredentials) {
    console.error('[login] signInWithPassword failed:', error.status, error.code, error.message)
    return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 503 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  await admin.from('login_failures').insert({ email, ip })

  const after = loginLimitState(
    [...(rows ?? []).map((r) => Date.parse(r.created_at)), Date.now()],
    Date.now(),
  )
  if (after.locked) {
    return NextResponse.json(
      {
        error: `로그인을 5번 실패해서 잠겼어요. ${formatRetryAfter(after.retryAfterSec)} 뒤에 다시 시도해 주세요.`,
        locked: true,
        retryAfterSec: after.retryAfterSec,
      },
      { status: 429, headers: { 'Retry-After': String(after.retryAfterSec) } },
    )
  }
  return NextResponse.json(
    { error: `이메일 또는 비밀번호가 맞지 않아요. (남은 시도 ${after.remaining}번)`, remaining: after.remaining },
    { status: 401 },
  )
}
