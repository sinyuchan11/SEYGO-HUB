'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * Unread DM count for the nav badge.
 *
 * Counted by `unread_dm_count()` in the DB (same rule as isConversationUnread)
 * so the badge costs one round trip instead of the inbox's three queries.
 *
 * The badge renders in three places at once (bottom nav, left rail, profile
 * menu), so the client, the realtime channel, the poll and the count all live
 * in one shared store — a channel per component would collide on the topic
 * name and throw once the first one subscribed.
 */

type Listener = (count: number) => void

let current = 0
let lastPath: string | null = null
const listeners = new Set<Listener>()

// createClient()는 호출할 때마다 새 클라이언트를 만든다. removeChannel은 채널을 만든
// 그 클라이언트에서 불러야 하므로 하나를 붙잡아 둔다.
let client: ReturnType<typeof createClient> | null = null
let channel: RealtimeChannel | null = null
let poll: ReturnType<typeof setInterval> | null = null
let retry: ReturnType<typeof setTimeout> | null = null
let connecting = false
let wired = false

function getClient() {
  if (!client) client = createClient()
  return client
}

async function load() {
  const { data, error } = await getClient().rpc('unread_dm_count')
  if (error) return
  const next = typeof data === 'number' ? data : 0
  if (next === current) return
  current = next
  for (const listener of listeners) listener(next)
}

/**
 * Recount now. Call it right after something that changes the count for sure —
 * marking a conversation read — instead of waiting on a realtime echo, which
 * both races with the navigation reload and needs the table to be published.
 */
export function refreshUnreadDmCount() {
  void load()
}

function dropChannel() {
  if (channel && client) client.removeChannel(channel)
  channel = null
}

function reconnect() {
  if (retry || listeners.size === 0) return
  dropChannel()
  retry = setTimeout(() => {
    retry = null
    void connect()
  }, 3_000)
}

async function connect() {
  if (channel || connecting) return
  connecting = true
  try {
    const supabase = getClient()
    // postgres_changes에는 RLS가 걸린다. 소켓에 내 토큰을 실어주지 않으면
    // 이벤트가 조용히 하나도 오지 않는다 (구독은 성공한 것처럼 보인다).
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (listeners.size === 0) return
    await supabase.realtime.setAuth(session?.access_token ?? null)

    channel = supabase
      .channel('dm-unread')
      // 새 메시지가 오면 올라간다. 읽어서 내려가는 쪽은 refreshUnreadDmCount()가
      // 확실히 처리하고, 이 구독은 다른 기기에서 읽은 경우를 위한 보조다.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () =>
        load()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads' }, () =>
        load()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void load()
          return
        }
        // 소켓이 끊기면 배지가 조용히 멈춘다. 끊긴 걸 감지하면 다시 붙는다.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          reconnect()
        }
      })
  } finally {
    connecting = false
  }
}

function wireWindow() {
  if (wired || typeof window === 'undefined') return
  wired = true

  const revive = () => {
    void load()
    if (!channel) void connect()
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revive()
  })
  window.addEventListener('online', revive)

  // 토큰이 갱신되면 소켓에도 새 토큰을 실어야 이벤트가 계속 온다.
  getClient().auth.onAuthStateChange((_event, session) => {
    void getClient().realtime.setAuth(session?.access_token ?? null)
  })
}

function start() {
  wireWindow()
  void connect()
  // 실시간이 주 경로고 이건 안전망이다. 배지 하나 세는 가벼운 RPC라 짧게 잡아도 된다.
  if (!poll) poll = setInterval(load, 15_000)
}

function stop() {
  // 개발 모드의 StrictMode는 마운트→언마운트→마운트를 반복한다. 바로 끊으면
  // 그 사이 채널이 사라졌다 다시 생기며 이벤트를 놓친다.
  setTimeout(() => {
    if (listeners.size > 0) return
    if (poll) {
      clearInterval(poll)
      poll = null
    }
    dropChannel()
    lastPath = null
  }, 1000)
}

export function useUnreadDmCount(): number {
  const pathname = usePathname()
  const [count, setCount] = useState(current)

  useEffect(() => {
    listeners.add(setCount)
    start()
    return () => {
      listeners.delete(setCount)
      stop()
    }
  }, [])

  // 대화를 읽고 나오면 바로 반영되도록. 훅이 여러 번 쓰여도 경로당 한 번만 센다.
  useEffect(() => {
    if (lastPath === pathname) return
    lastPath = pathname
    void load()
  }, [pathname])

  return count
}
