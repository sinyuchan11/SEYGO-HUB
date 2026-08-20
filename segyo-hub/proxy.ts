import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import {
  PLACEHOLDER_URL,
  PLACEHOLDER_ANON_KEY,
  isSupabaseConfigured,
} from '@/lib/supabase/config'
import type { UserRole } from '@/lib/permissions'

const PUBLIC_PATHS = ['/login', '/signup']
const PENDING_ALLOWED = ['/pending']
const ONBOARDING_PATH = '/onboarding'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Static assets and auth API routes — bypass proxy entirely.
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next({ request })
  }

  // If Supabase env vars aren't set, let everything through.
  // The app shell will render; calls to Supabase will fail at the page level.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request })
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  let user: User | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    // Network or auth failure — allow the request through; UI will handle missing session.
    console.error('[proxy] supabase.auth.getUser failed:', err)
    return response
  }

  // 로그인 안 됨 + 비공개 경로 → /login
  if (!user) {
    if (PUBLIC_PATHS.includes(pathname)) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 로그인 됨 + /login,/signup → /
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // role과 nickname 조회.
  // supabase-js 는 PostgREST 에러를 throw 하지 않고 { data: null, error } 로 준다.
  // 그래서 예전 try/catch 는 거의 죽은 코드였고, 조회가 실패하면 profile 이 null 인 채
  // 그냥 통과(fall open)해서 pending/banned 사용자가 보호된 페이지를 볼 수 있었다.
  // 실제 쓰기는 RLS 가 막지만, 여기서도 닫는 쪽으로 처리한다.
  let profile: { role: UserRole; nickname: string | null } | null = null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, nickname')
      .eq('id', user.id)
      .single()
    if (error) throw error
    profile = data
  } catch (err) {
    console.error('[proxy] profile lookup failed:', err)
    // 이미 /pending 이면 리다이렉트 루프가 되므로 그대로 둔다.
    if (PENDING_ALLOWED.includes(pathname)) return response
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  if (!profile) {
    if (PENDING_ALLOWED.includes(pathname)) return response
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // pending → /pending 외엔 차단
  if (profile.role === 'pending') {
    if (PENDING_ALLOWED.includes(pathname)) return response
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // banned → /pending (별도 메시지)
  if (profile.role === 'banned') {
    if (PENDING_ALLOWED.includes(pathname)) return response
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // member 이상인데 nickname 없으면 → /onboarding
  if (!profile.nickname && pathname !== ONBOARDING_PATH) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // nickname 있는데 /onboarding 들어가면 → /
  if (profile.nickname && pathname === ONBOARDING_PATH) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
