import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FriendsPanel, type Person } from '@/components/friends/FriendsPanel'

type FriendshipRow = {
  id: number
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
}

export default async function FriendsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: fs } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .order('created_at', { ascending: false })
    .returns<FriendshipRow[]>()

  const mine = fs ?? []
  const otherId = (f: FriendshipRow) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  const otherIds = [...new Set(mine.map(otherId))]

  const profileMap = new Map<string, { nickname: string | null; avatar_url: string | null }>()
  if (otherIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('id', otherIds)
    for (const p of profs ?? []) {
      profileMap.set(p.id as string, { nickname: p.nickname, avatar_url: p.avatar_url })
    }
  }

  const toPerson = (f: FriendshipRow): Person => {
    const oid = otherId(f)
    const p = profileMap.get(oid)
    return { friendshipId: f.id, id: oid, nickname: p?.nickname ?? null, avatarUrl: p?.avatar_url ?? null }
  }

  const friends = mine.filter((f) => f.status === 'accepted').map(toPerson)
  const incoming = mine
    .filter((f) => f.status === 'pending' && f.addressee_id === user.id)
    .map(toPerson)
  const outgoing = mine
    .filter((f) => f.status === 'pending' && f.requester_id === user.id)
    .map(toPerson)

  return (
    <div className="px-3 py-2 pb-24 md:pb-8">
      <h1 className="mb-4 text-lg font-bold text-foreground">친구</h1>
      <FriendsPanel myId={user.id} friends={friends} incoming={incoming} outgoing={outgoing} />
    </div>
  )
}
