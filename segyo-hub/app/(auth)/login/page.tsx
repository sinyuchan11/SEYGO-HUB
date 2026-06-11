import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    // Full-screen canvas background, vertically and horizontally centered
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/*
        Split card:
        - max-w-[960px] on md+, max-w-md on mobile (form-only)
        - overflow-hidden so gradient panel corners are clipped
        - rounded-3xl + large shadow
      */}
      <div className="w-full max-w-md md:max-w-[960px] overflow-hidden rounded-3xl shadow-2xl flex">

        {/* ── LEFT PANEL (brand) — hidden below md, all white ── */}
        <div className="hidden md:flex flex-col justify-between bg-surface p-10 md:w-[420px] shrink-0">
          {/* Top: large logo mark (no badge) filling the panel */}
          <div className="flex-1 flex items-center justify-center py-4">
            <img
              src="/logo.svg"
              alt="Segyo Hub"
              className="w-full max-w-[340px] object-contain"
            />
          </div>

          {/* Bottom: headline copy */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-snug">
              Segyo Hub<br />
              오신걸 환영 합니다
            </h2>
          </div>
        </div>

        {/* ── RIGHT PANEL (form) — vertically centered for top/bottom symmetry ── */}
        <div className="flex-1 bg-surface p-8 md:p-10 flex flex-col justify-center">
          {/* Heading */}
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold text-foreground">로그인</h1>
            <p className="text-sm text-muted-fg">다시 오신 걸 환영해요</p>
          </div>

          {/* Auth form */}
          <LoginForm />

          {/* Footer — signup link */}
          <p className="mt-6 text-center text-sm text-muted-fg">
            아직 계정 없어요?{' '}
            <Link href="/signup" className="text-primary-600 font-medium hover:underline">
              가입하기
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
