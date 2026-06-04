'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { TooltipProvider, Tooltip } from '@/components/ui/Tooltip'

const items = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/board', label: '게시판', icon: '📝' },
  { href: '/post/new', label: '글쓰기', icon: '✏️' },
  { href: '/me', label: '내 정보', icon: '👤' },
] as const

export function LeftRail() {
  const pathname = usePathname()
  return (
    <TooltipProvider delayDuration={200}>
      <nav className="hidden shrink-0 py-2 md:block">
        <ul className="sticky top-20 flex w-16 flex-col items-center gap-1 rounded-lg border border-border bg-surface py-3">
          {items.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Tooltip label={item.label}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors',
                      active
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-muted-fg hover:bg-muted',
                    )}
                  >
                    {item.icon}
                  </Link>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      </nav>
    </TooltipProvider>
  )
}
