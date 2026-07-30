'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/cn'
import type { FriendState } from '@/lib/friends'

const BASE = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50'

export function FriendButton({
  targetId,
  initialState,
  friendshipId,
}: {
  targetId: string
  initialState: FriendState
  friendshipId: number | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const supabase = createClient()

  async function run(fn: () => Promise<{ error: unknown } | void>) {
    setBusy(true)
    await fn()
    setBusy(false)
    router.refresh()
  }

  async function sendRequest() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: targetId })
  }

  async function accept() {
    if (friendshipId == null) return
    await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', friendshipId)
  }

  async function remove() {
    if (friendshipId == null) return
    await supabase.from('friendships').delete().eq('id', friendshipId)
  }

  if (initialState === 'friends') {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => run(remove)}
        className={cn(BASE, 'border border-border bg-surface text-foreground hover:bg-muted')}
      >
        친구 ✓ · 끊기
      </button>
    )
  }

  if (initialState === 'outgoing') {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => run(remove)}
        className={cn(BASE, 'border border-border bg-surface text-muted-fg hover:bg-muted')}
      >
        요청됨 · 취소
      </button>
    )
  }

  if (initialState === 'incoming') {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(accept)}
          className={cn(BASE, 'bg-primary-600 text-white hover:bg-primary-700')}
        >
          수락
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(remove)}
          className={cn(BASE, 'border border-border bg-surface text-foreground hover:bg-muted')}
        >
          거절
        </button>
      </div>
    )
  }

  // none
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => run(sendRequest)}
      className={cn(BASE, 'bg-primary-600 text-white hover:bg-primary-700')}
    >
      친구 추가
    </button>
  )
}
