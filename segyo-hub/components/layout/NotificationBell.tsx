'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Notif = {
  id: number
  kind: 'comment_on_post' | 'reply_on_comment'
  payload: { post_id: number; comment_id: number; parent_comment_id?: number; actor_id: string }
  read_at: string | null
  created_at: string
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const unread = items.filter((i) => i.read_at === null).length

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data as any) ?? [])
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  async function markRead() {
    await fetch('/api/notifications/read', { method: 'POST' })
    load()
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="알림"
        onClick={() => setOpen((v) => !v)}
        className="relative text-xl"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded border bg-white shadow">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">알림</span>
            <button onClick={markRead} className="text-xs text-blue-600">
              모두 읽음
            </button>
          </div>
          <ul className="max-h-80 overflow-auto">
            {items.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-gray-500">없음</li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={`cursor-pointer border-b px-3 py-2 text-sm ${
                  n.read_at === null ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setOpen(false)
                  router.push(`/post/${n.payload.post_id}`)
                }}
              >
                {n.kind === 'comment_on_post'
                  ? '내 글에 새 댓글이 달렸어요'
                  : '내 댓글에 답글이 달렸어요'}
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(n.created_at).toLocaleString('ko-KR')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
