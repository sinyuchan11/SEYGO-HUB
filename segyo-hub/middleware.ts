import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  PLACEHOLDER_URL,
  PLACEHOLDER_ANON_KEY,
  isSupabaseConfigured,
} from '@/lib/supabase/config'

const PUBLIC_PATHS = ['/login', '/signup']
const PENDING_ALLOWED = ['/pending']
const ONBOARDING_PATH = '/onboarding'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Static assets and auth API routes — bypass middleware entirely.
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next({ request })
  }

  // If Supabase isn't configured (placeholder keys), let everything through.
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

  let user
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    // Network or auth failure — allow the request through; UI will handle missing session.
    console.error('[middleware] supabase.auth.getUser failed:', err)
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

  // role과 nickname 조회
  let profile: { role: string; nickname: string | null } | null = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role, nickname')
      .eq('id', user.id)
      .single()
    profile = data
  } catch (err) {
    console.error('[middleware] profile lookup failed:', err)
    return response
  }

  if (!profile) return response

  // pending → /pending 외엔 차단
  if (profile.role === 'pending') {
    if (PENDING_ALLOWED.includes(pathname) || pathname === '/pending') return response
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // banned → /pending (별도 메시지)
  if (profile.role === 'banned') {
    if (pathname === '/pending') return response
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
