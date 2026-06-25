import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileEditForm, type ProfileEditInitial } from '@/components/profile/ProfileEditForm'

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, grade_class, tagline, bio, interests, avatar_url, cover_url')
    .eq('id', user.id)
    .single()

  const initial: ProfileEditInitial = {
    nickname: profile?.nickname ?? null,
    grade_class: profile?.grade_class ?? null,
    tagline: profile?.tagline ?? null,
    bio: profile?.bio ?? null,
    interests: Array.isArray(profile?.interests) ? profile!.interests : [],
    avatar_url: profile?.avatar_url ?? null,
    cover_url: profile?.cover_url ?? null,
  }

  return (
    <div className="px-3 py-2 pb-24 md:pb-8">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/me"
          aria-label="뒤로"
          className="-ml-1 inline-flex rounded-lg p-1.5 text-muted-fg hover:bg-muted"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h2 className="text-lg font-bold text-foreground">프로필 편집</h2>
      </div>
      <ProfileEditForm userId={user.id} initial={initial} />
    </div>
  )
}
