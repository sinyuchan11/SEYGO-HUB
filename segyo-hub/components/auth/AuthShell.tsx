import type { ReactNode } from 'react'

/**
 * 인증 화면(로그인·가입·온보딩)의 공용 껍데기.
 *
 * 원래는 로그인 페이지에만 이 스플릿 카드가 있었고 가입·온보딩은 맨바닥에
 * 날것 input 만 놓여 있었다. 같은 껍데기를 쓰게 해서 화면 사이 인상이
 * 끊기지 않도록 한다. 브랜드 패널은 md 아래에서 숨고 폼만 남는다.
 */
export function AuthShell({
  title,
  subtitle,
  headline,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  /** 좌측 브랜드 패널 하단 문구. 화면마다 다르게 준다. */
  headline: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="flex w-full max-w-md overflow-hidden rounded-3xl shadow-2xl md:max-w-[960px]">
        {/* ── 브랜드 패널 (md 미만에서는 숨김) ── */}
        <div className="hidden shrink-0 flex-col justify-between bg-surface p-10 md:flex md:w-[420px]">
          <div className="flex flex-1 items-center justify-center py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Segyo Hub"
              className="w-full max-w-[340px] object-contain"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold leading-snug text-foreground md:text-3xl">
              {headline}
            </h2>
          </div>
        </div>

        {/* ── 폼 패널 ── */}
        <div className="flex flex-1 flex-col justify-center bg-surface p-8 md:p-10">
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-fg">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-muted-fg">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
