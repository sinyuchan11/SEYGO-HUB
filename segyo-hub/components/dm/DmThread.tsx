'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { formatClock } from '@/lib/time'
import { cn } from '@/lib/cn'

export type DmMessage = { id: number; sender_id: string; body: string; created_at: string }

export function DmThread({
  conversationId,
  myId,
  other,
  initial,
  otherLastReadAt,
}: {
  conversationId: number
  myId: string
  other: { id: string; nickname: string | null; avatarUrl: string | null }
  initial: DmMessage[]
  otherLastReadAt: string | null
}) {
  const [supabase] = useState(() => createClient())
  const [msgs, setMsgs] = useState<DmMessage[]>(initial)
  const [otherRead, setOtherRead] = useState<string | null>(otherLastReadAt)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function markRead() {
    await supabase.from('conversation_reads').upsert(
      { conversation_id: conversationId, user_id: myId, last_read_at: new Date().toISOString() },
      { onConflict: 'conversation_id,user_id' },
    )
  }

  useEffect(() => {
    markRead()
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as DmMessage
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
          if (m.sender_id !== myId) markRead()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_reads',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const r = payload.new as { user_id?: string; last_read_at?: string } | null
          if (r && r.user_id === other.id && r.last_read_at) setOtherRead(r.last_read_at)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setSending(true)
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: myId, body })
      .select('id, sender_id, body, created_at')
      .single()
    setSending(false)
    setText('')
    if (data) {
      const m = data as DmMessage
      setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    }
  }

  // Id of my most recent message (for the single "읽음" indicator).
  let lastMineId: number | null = null
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].sender_id === myId) {
      lastMineId = msgs[i].id
      break
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Link href={`/u/${other.id}`} className="flex items-center gap-2 hover:opacity-80">
          <Avatar name={other.nickname ?? '?'} src={other.avatarUrl} size={32} />
          <span className="font-semibold text-foreground">{other.nickname ?? '(이름 없음)'}</span>
        </Link>
      </div>

      {/* Messages */}
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto py-3">
        {msgs.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-fg">첫 메시지를 보내보세요.</p>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_id === myId
            const showRead =
              mine &&
              m.id === lastMineId &&
              !!otherRead &&
              new Date(otherRead).getTime() >= new Date(m.created_at).getTime()
            return (
              <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-primary-600 text-white' : 'bg-muted text-foreground',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn('mt-0.5 text-[10px]', mine ? 'text-white/70' : 'text-muted-fg')}
                    suppressHydrationWarning
                  >
                    {formatClock(m.created_at)}
                  </p>
                </div>
                {showRead && <span className="mt-0.5 pr-1 text-[10px] text-muted-fg">읽음</span>}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border pt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지 입력"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary-400"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
        >
          전송
        </button>
      </form>
    </div>
  )
}
