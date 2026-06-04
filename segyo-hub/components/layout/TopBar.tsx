'use client'

import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { NotificationBell } from './NotificationBell'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu'

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-primary-600 px-4 text-white">
      <Link href="/" className="text-lg font-bold">
        Segyo Hub
      </Link>

      <div className="hidden flex-1 md:block">
        <Input
          placeholder="검색…"
          className="border-transparent bg-white/15 text-white placeholder:text-white/70 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="내 메뉴" className="outline-none">
            <Avatar name="나" size={32} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href="/me">내 정보</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/board">게시판</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
