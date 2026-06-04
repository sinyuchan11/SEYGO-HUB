'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const tabs = [
  { href: '/', label: '홈' },
  { href: '/board', label: '게시판' },
  { href: '/post/new', label: '글쓰기' },
  { href: '/me', label: '내정보' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface md:hidden">
      {tabs.map((t) => {
        const active =
          t.href === '/'
            ? pathname === '/'
            : pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'py-3 text-center text-sm',
              active ? 'font-bold text-primary-600' : 'text-muted-fg',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
