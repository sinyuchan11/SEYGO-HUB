import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ProfileWithStats } from '@/lib/profile'

export function ProfileAbout({ profile }: { profile: ProfileWithStats }) {
  const joined = new Date(profile.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  })
  return (
    <Card className="space-y-4 p-4">
      {profile.bio ? (
        <p className="whitespace-pre-wrap text-sm text-foreground">{profile.bio}</p>
      ) : (
        <p className="text-sm text-muted-fg">소개가 아직 없어요.</p>
      )}
      {profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.interests.map((tag) => (
            <Badge key={tag} tone="primary">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-fg">{joined} 가입</p>
    </Card>
  )
}
