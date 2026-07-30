'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import {
  HomeIcon,
  BoardIcon,
  PenSquareIcon,
  UserIcon,
  UsersIcon,
  SendIcon,
} from '@/components/ui/icons'

const tabs = [
  { href: '/', label: '홈', Icon: HomeIcon },
  { href: '/board', label: '게시판', Icon: BoardIcon },
  { href: '/post/new', label: '글쓰기', Icon: PenSquareIcon },
  { href: '/friends', label: '친구', Icon: UsersIcon },
  { href: '/messages', label: '메시지', Icon: SendIcon },
  { href: '/me', label: '내정보', Icon: UserIcon },
] as const

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {tabs.map(({ href, label, Icon }) => {
        const active =
          href === '/'
            ? pathname === '/'
            : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 transition-colors',
              active ? 'text-primary-600' : 'text-muted-fg',
            )}
          >
            <Icon size={20} className={active ? 'stroke-[2.5]' : undefined} />
            <span className={cn('text-[11px]', active && 'font-semibold')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
