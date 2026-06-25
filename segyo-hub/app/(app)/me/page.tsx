import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { coerceProfile } from '@/lib/profile'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileAbout } from '@/components/profile/ProfileAbout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const ROLE_LABEL: Record<string, string> = {
  pending: '대기',
  member: '멤버',
  moderator: '모더레이터',
  admin: '관리자',
  banned: '차단',
}

function roleTone(role: string): 'neutral' | 'primary' | 'danger' {
  if (role === 'admin' || role === 'moderator') return 'primary'
  if (role === 'banned') return 'danger'
  return 'neutral'
}

export default async function MePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase.rpc('get_profile_with_stats', {
    target_id: user.id,
  })
  const profile = Array.isArray(rows) && rows[0] ? coerceProfile(rows[0]) : null

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const showAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

  return (
    <div className="space-y-4 px-3 py-2 pb-24 md:pb-8">
      {profile ? (
        <>
          <ProfileHeader
            profile={profile}
            actionSlot={
              <Link
                href="/me/edit"
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                프로필 편집
              </Link>
            }
          />
          <ProfileAbout profile={profile} />
        </>
      ) : (
        <Card className="p-4 text-sm text-muted-fg">프로필을 불러오지 못했어요.</Card>
      )}

      {/* Account info */}
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-bold text-foreground">계정 정보</h3>
        <dl className="text-sm">
          <Row label="이메일" value={user.email ?? '-'} />
          <Row label="학년·반" value={profile?.grade_class ?? '-'} />
          <Row
            label="권한"
            value={
              <Badge tone={roleTone(profile?.role ?? 'member')}>
                {ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? '-'}
              </Badge>
            }
          />
        </dl>
      </Card>

      {/* Actions */}
      {showAdmin && (
        <Link
          href="/admin/users"
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <span>관리자 페이지</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      )}

      <form action={logout}>
        <button className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10">
          로그아웃
        </button>
      </form>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <dt className="text-muted-fg">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}
