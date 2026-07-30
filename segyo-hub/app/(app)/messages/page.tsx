import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/time'
import { isConversationUnread } from '@/lib/dm'
import { MessageIcon } from '@/components/ui/icons'

type ConvRow = { id: number; user_lo: string; user_hi: string; last_message_at: string }
type MsgRow = { conversation_id: number; sender_id: string; body: string; created_at: string }

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: convs } = await supabase
    .from('conversations')
    .select('id, user_lo, user_hi, last_message_at')
    .order('last_message_at', { ascending: false })
    .returns<ConvRow[]>()

  const list = convs ?? []
  const otherId = (c: ConvRow) => (c.user_lo === user.id ? c.user_hi : c.user_lo)
  const otherIds = [...new Set(list.map(otherId))]
  const convIds = list.map((c) => c.id)

  const [profRes, msgRes, readRes] = await Promise.all([
    otherIds.length
      ? supabase.from('profiles').select('id, nickname, avatar_url').in('id', otherIds)
      : Promise.resolve({ data: [] }),
    convIds.length
      ? supabase
          .from('messages')
          .select('conversation_id, sender_id, body, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .returns<MsgRow[]>()
      : Promise.resolve({ data: [] }),
    convIds.length
      ? supabase
          .from('conversation_reads')
          .select('conversation_id, last_read_at')
          .in('conversation_id', convIds)
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ])

  const pmap = new Map(
    ((profRes.data ?? []) as { id: string; nickname: string | null; avatar_url: string | null }[]).map(
      (p) => [p.id, p],
    ),
  )
  const lastMsg = new Map<number, MsgRow>()
  for (const m of (msgRes.data ?? []) as MsgRow[]) {
    if (!lastMsg.has(m.conversation_id)) lastMsg.set(m.conversation_id, m) // desc → first is latest
  }
  const readMap = new Map(
    ((readRes.data ?? []) as { conversation_id: number; last_read_at: string }[]).map((r) => [
      r.conversation_id,
      r.last_read_at,
    ]),
  )

  const items = list.map((c) => {
    const oid = otherId(c)
    const p = pmap.get(oid)
    const lm = lastMsg.get(c.id)
    return {
      id: c.id,
      otherId: oid,
      nickname: p?.nickname ?? null,
      avatarUrl: p?.avatar_url ?? null,
      preview: lm?.body ?? '',
      lastMessageAt: c.last_message_at,
      unread: isConversationUnread(
        {
          lastMessageAt: c.last_message_at,
          lastReadAt: readMap.get(c.id) ?? null,
          lastSenderId: lm?.sender_id ?? null,
        },
        user.id,
      ),
    }
  })

  return (
    <div className="px-3 py-2 pb-24 md:pb-8">
      <h1 className="mb-4 text-lg font-bold text-foreground">메시지</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <MessageIcon size={32} className="mx-auto text-muted-fg" />
          <p className="mt-2 font-medium text-foreground">아직 대화가 없어요</p>
          <p className="mt-1 text-sm text-muted-fg">프로필에서 &lsquo;메시지&rsquo;로 대화를 시작해보세요.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/messages/${it.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 hover:bg-muted"
              >
                <Avatar name={it.nickname ?? '?'} src={it.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {it.nickname ?? '(이름 없음)'}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-fg" suppressHydrationWarning>
                      {timeAgo(it.lastMessageAt)}
                    </span>
                  </div>
                  <p
                    className={
                      'truncate text-sm ' +
                      (it.unread ? 'font-semibold text-foreground' : 'text-muted-fg')
                    }
                  >
                    {it.preview || '(메시지 없음)'}
                  </p>
                </div>
                {it.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
