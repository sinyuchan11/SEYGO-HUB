import { createClient } from '@/lib/supabase/server'
import { TopBar } from './TopBar'
import { LeftRail } from './LeftRail'
import { RightRail } from './RightRail'
import { BottomNav } from './BottomNav'

export async function AppShell({
  children,
  rightRail,
}: {
  children: React.ReactNode
  rightRail?: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('nickname, avatar_url, role').eq('id', user.id).single()
    : { data: null }

  return (
    <div className="min-h-screen bg-canvas">
      <TopBar
        nickname={profile?.nickname ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        email={user?.email ?? null}
        role={profile?.role ?? null}
      />
      <div className="mx-auto flex max-w-[1400px] gap-2 px-2 pb-20 md:pb-2">
        <LeftRail />
        <main className="min-w-0 flex-1 py-2">{children}</main>
        {rightRail ? <RightRail>{rightRail}</RightRail> : null}
      </div>
      <BottomNav />
    </div>
  )
}
