'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { SearchIcon } from '@/components/ui/icons'
import { MessageButton } from '@/components/dm/MessageButton'
import { cn } from '@/lib/cn'

export type Person = {
  friendshipId: number
  id: string
  nickname: string | null
  avatarUrl: string | null
}

type SearchResult = { id: string; nickname: string | null; avatar_url: string | null }

const BTN = 'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50'

export function FriendsPanel({
  myId,
  friends,
  incoming,
  outgoing,
}: {
  myId: string
  friends: Person[]
  incoming: Person[]
  outgoing: Person[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  async function act(fn: () => PromiseLike<unknown>) {
    setBusy(true)
    await fn()
    setBusy(false)
    router.refresh()
  }

  const accept = (id: number) =>
    act(() =>
      supabase
        .from('friendships')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', id),
    )
  const remove = (id: number) => act(() => supabase.from('friendships').delete().eq('id', id))

  async function search(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .ilike('nickname', `%${term}%`)
      .neq('id', myId)
      .limit(10)
    setResults((data as SearchResult[]) ?? [])
    setSearching(false)
  }

  async function sendRequest(targetId: string) {
    await act(() =>
      supabase.from('friendships').insert({ requester_id: myId, addressee_id: targetId }),
    )
    setResults(null)
    setQ('')
  }

  function personRow(p: Person, actions: React.ReactNode) {
    return (
      <li
        key={p.friendshipId}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
      >
        <Link href={`/u/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={p.nickname ?? '?'} src={p.avatarUrl} size={40} />
          <span className="truncate text-sm font-medium text-foreground">
            {p.nickname ?? '(이름 없음)'}
          </span>
        </Link>
        <div className="flex shrink-0 gap-2">{actions}</div>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      {/* 친구 찾기 */}
      <section>
        <h3 className="mb-2 text-sm font-bold text-foreground">친구 찾기</h3>
        <form onSubmit={search} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-primary-300">
          <SearchIcon size={18} className="text-muted-fg" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="닉네임 검색"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-fg"
          />
          <button type="submit" disabled={searching} className={cn(BTN, 'bg-primary-600 text-white hover:bg-primary-700')}>
            검색
          </button>
        </form>
        {results !== null && (
          <ul className="mt-2 space-y-2">
            {results.length === 0 ? (
              <li className="px-1 py-2 text-sm text-muted-fg">검색 결과가 없어요.</li>
            ) : (
              results.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                  <Link href={`/u/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={r.nickname ?? '?'} src={r.avatar_url} size={40} />
                    <span className="truncate text-sm font-medium text-foreground">
                      {r.nickname ?? '(이름 없음)'}
                    </span>
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => sendRequest(r.id)}
                    className={cn(BTN, 'shrink-0 bg-primary-600 text-white hover:bg-primary-700')}
                  >
                    친구 추가
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {/* 받은 요청 */}
      {incoming.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-foreground">받은 요청 ({incoming.length})</h3>
          <ul className="space-y-2">
            {incoming.map((p) =>
              personRow(
                p,
                <>
                  <button type="button" disabled={busy} onClick={() => accept(p.friendshipId)} className={cn(BTN, 'bg-primary-600 text-white hover:bg-primary-700')}>
                    수락
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(p.friendshipId)} className={cn(BTN, 'border border-border bg-surface text-foreground hover:bg-muted')}>
                    거절
                  </button>
                </>,
              ),
            )}
          </ul>
        </section>
      )}

      {/* 보낸 요청 */}
      {outgoing.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-foreground">보낸 요청 ({outgoing.length})</h3>
          <ul className="space-y-2">
            {outgoing.map((p) =>
              personRow(
                p,
                <button type="button" disabled={busy} onClick={() => remove(p.friendshipId)} className={cn(BTN, 'border border-border bg-surface text-muted-fg hover:bg-muted')}>
                  취소
                </button>,
              ),
            )}
          </ul>
        </section>
      )}

      {/* 친구 목록 */}
      <section>
        <h3 className="mb-2 text-sm font-bold text-foreground">친구 ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted-fg">
            아직 친구가 없어요. 위에서 닉네임으로 찾아보세요!
          </p>
        ) : (
          <ul className="space-y-2">
            {friends.map((p) =>
              personRow(
                p,
                <>
                  <button type="button" disabled={busy} onClick={() => remove(p.friendshipId)} className={cn(BTN, 'border border-border bg-surface text-foreground hover:bg-muted')}>
                    끊기
                  </button>
                  <MessageButton
                    targetId={p.id}
                    className={cn(BTN, 'bg-primary-600 text-white hover:bg-primary-700')}
                  />
                </>,
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
