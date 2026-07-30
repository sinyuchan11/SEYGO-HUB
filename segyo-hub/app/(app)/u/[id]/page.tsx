import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { coerceProfile } from '@/lib/profile'
import { resolveFriendState, type FriendshipRow } from '@/lib/friends'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileAbout } from '@/components/profile/ProfileAbout'
import { FriendButton } from '@/components/friends/FriendButton'
import { MessageButton } from '@/components/dm/MessageButton'
import { Card } from '@/components/ui/Card'

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Viewing self → send them to their own profile.
  if (id === user.id) redirect('/me')

  const { data: rows } = await supabase.rpc('get_profile_with_stats', { target_id: id })
  const profile = Array.isArray(rows) && rows[0] ? coerceProfile(rows[0]) : null

  if (!profile) {
    return (
      <div className="px-3 py-2">
        <Card className="p-4 text-sm text-muted-fg">프로필을 찾을 수 없어요.</Card>
      </div>
    )
  }

  const { data: rel } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`,
    )
    .maybeSingle<FriendshipRow>()

  const state = resolveFriendState(rel ?? null, user.id)
  const { data: canDm } = await supabase.rpc('can_dm', { other: id })

  return (
    <div className="space-y-4 px-3 py-2 pb-24 md:pb-8">
      <ProfileHeader
        profile={profile}
        actionSlot={
          <div className="flex gap-2">
            {canDm === true && <MessageButton targetId={id} />}
            <FriendButton targetId={id} initialState={state} friendshipId={rel?.id ?? null} />
          </div>
        }
      />
      <ProfileAbout profile={profile} />
    </div>
  )
}
