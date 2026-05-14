'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: '홈' },
  { href: '/board', label: '게시판' },
  { href: '/me', label: '내정보' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t bg-white">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`py-3 text-center text-sm ${
              active ? 'font-bold text-blue-600' : 'text-gray-600'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
