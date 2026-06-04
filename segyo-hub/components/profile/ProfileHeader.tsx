import { Avatar } from '@/components/ui/Avatar'
import { ProfileStats } from './ProfileStats'
import type { ProfileWithStats } from '@/lib/profile'

export function ProfileHeader({
  profile,
  actionSlot,
}: {
  profile: ProfileWithStats
  actionSlot?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className="h-32 bg-primary-100"
        style={
          profile.cover_url
            ? {
                backgroundImage: `url("${profile.cover_url}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      />
      <div className="px-4 pb-4">
        <div className="-mt-8 flex items-end justify-between">
          <Avatar
            name={profile.nickname ?? '?'}
            src={profile.avatar_url}
            size={64}
            className="ring-4 ring-surface"
          />
          {actionSlot}
        </div>
        <div className="mt-2">
          <h1 className="text-lg font-bold text-foreground">
            {profile.nickname ?? '이름 없음'}
          </h1>
          {profile.tagline && <p className="text-sm text-muted-fg">{profile.tagline}</p>}
        </div>
        <ProfileStats
          postCount={profile.post_count}
          likesReceived={profile.likes_received}
          className="mt-3"
        />
      </div>
    </div>
  )
}
