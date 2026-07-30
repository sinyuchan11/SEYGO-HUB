import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DmThread, type DmMessage } from '@/components/dm/DmThread'

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const convId = Number(id)
  if (!Number.isInteger(convId)) redirect('/messages')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS: non-participants get null.
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, user_lo, user_hi')
    .eq('id', convId)
    .maybeSingle()
  if (!conv) redirect('/messages')

  const otherId = conv.user_lo === user.id ? conv.user_hi : conv.user_lo
  const { data: op } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url')
    .eq('id', otherId)
    .single()

  const { data: msgs } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(200)
    .returns<DmMessage[]>()

  return (
    <div className="px-3 py-2">
      <DmThread
        conversationId={convId}
        myId={user.id}
        other={{ id: otherId, nickname: op?.nickname ?? null, avatarUrl: op?.avatar_url ?? null }}
        initial={msgs ?? []}
      />
    </div>
  )
}
