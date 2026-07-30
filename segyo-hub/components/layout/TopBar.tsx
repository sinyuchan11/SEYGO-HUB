'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu'

export function TopBar({
  nickname,
  avatarUrl,
  email,
  role,
}: {
  nickname: string | null
  avatarUrl: string | null
  email: string | null
  role: string | null
}) {
  const router = useRouter()
  const isStaff = role === 'admin' || role === 'moderator'
  const name = nickname ?? '나'

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="내 메뉴" className="rounded-full outline-none ring-white/50 focus-visible:ring-2">
            <Avatar name={name} src={avatarUrl} size={32} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {/* Identity header */}
            <div className="flex items-center gap-2 px-3 py-2">
              <Avatar name={name} src={avatarUrl} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                {email && <p className="truncate text-xs text-muted-fg">{email}</p>}
              </div>
            </div>

            <div className="my-1 h-px bg-border" />

            <DropdownMenuItem asChild>
              <Link href="/me">내 프로필</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/friends">친구</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications">알림</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/board">게시판</Link>
            </DropdownMenuItem>
            {isStaff && (
              <DropdownMenuItem asChild>
                <Link href="/admin/users">관리자</Link>
              </DropdownMenuItem>
            )}

            <div className="my-1 h-px bg-border" />

            <DropdownMenuItem
              onSelect={() => logout()}
              className="text-danger data-[highlighted]:bg-danger/10"
            >
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
