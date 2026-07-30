'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { TooltipProvider, Tooltip } from '@/components/ui/Tooltip'
import {
  HomeIcon,
  BoardIcon,
  PenSquareIcon,
  UserIcon,
  UsersIcon,
  SendIcon,
} from '@/components/ui/icons'

const items = [
  { href: '/', label: '홈', Icon: HomeIcon },
  { href: '/board', label: '게시판', Icon: BoardIcon },
  { href: '/post/new', label: '글쓰기', Icon: PenSquareIcon },
  { href: '/friends', label: '친구', Icon: UsersIcon },
  { href: '/messages', label: '메시지', Icon: SendIcon },
  { href: '/me', label: '내 정보', Icon: UserIcon },
] as const

export function LeftRail() {
  const pathname = usePathname()
  return (
    <TooltipProvider delayDuration={200}>
      <nav className="hidden shrink-0 py-2 md:block">
        <ul className="sticky top-16 flex w-16 flex-col items-center gap-1 rounded-lg border border-border bg-surface py-3">
          {items.map(({ href, label, Icon }) => {
            const active =
              href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Tooltip label={label}>
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      active
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-muted-fg hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon size={20} />
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
