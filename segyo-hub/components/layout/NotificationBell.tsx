'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/time'
import { cn } from '@/lib/cn'
import { MessageIcon, ReplyIcon, BellIcon } from '@/components/ui/icons'

type Notif = {
  id: number
  kind: 'comment_on_post' | 'reply_on_comment'
  payload: { post_id: number; comment_id: number; parent_comment_id?: number; actor_id: string }
  read_at: string | null
  created_at: string
}

function KindIcon({ kind }: { kind: Notif['kind'] }) {
  const Icon = kind === 'reply_on_comment' ? ReplyIcon : MessageIcon
  return <Icon size={18} className="mt-0.5 shrink-0 text-primary-600" />
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const unread = items.filter((i) => i.read_at === null).length

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data as Notif[]) ?? [])
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markAllRead() {
    await fetch('/api/notifications/read', { method: 'POST' })
    await load()
  }

  async function markReadAndNavigate(n: Notif) {
    setOpen(false)
    // Mark this notification read if it isn't already
    if (n.read_at === null) {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', n.id)
      setItems((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      )
    }
    router.push(`/post/${n.payload.post_id}`)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="알림"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full text-xl transition-colors',
          open ? 'bg-primary-50 text-primary-600' : 'hover:bg-muted',
        )}
      >
        {/* Bell SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-danger px-0.5 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">알림</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-[340px] overflow-y-auto">
            {items.length === 0 ? (
              <li className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <BellIcon size={28} className="text-muted-fg" />
                <p className="text-sm font-medium text-foreground">새 알림이 없어요</p>
                <p className="text-xs text-muted-fg">댓글이나 답글이 달리면 여기에 표시돼요.</p>
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => markReadAndNavigate(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted',
                      n.read_at === null && 'bg-primary-50 hover:bg-primary-100',
                    )}
                  >
                    <KindIcon kind={n.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {n.kind === 'comment_on_post'
                          ? '내 글에 새 댓글이 달렸어요'
                          : '내 댓글에 답글이 달렸어요'}
                      </p>
                      <p
                        className="mt-0.5 text-xs text-muted-fg"
                        suppressHydrationWarning
                      >
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {n.read_at === null && (
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-600" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          <div className="border-t border-border">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center py-2.5 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
            >
              전체 알림 보기
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
