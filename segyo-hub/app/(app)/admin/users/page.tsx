import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { UserTable } from '@/components/admin/UserTable'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!me || (me.role !== 'admin' && me.role !== 'moderator')) {
    redirect('/')
  }

  const svc = createServiceClient()
  const { data: { users: authUsers } } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 })
  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? null]))

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, role, grade_class, created_at')
    .order('created_at', { ascending: false })

  const rows = (profiles ?? []).map((p: any) => ({
    id: p.id,
    nickname: p.nickname,
    email: emailById.get(p.id) ?? null,
    role: p.role,
    grade_class: p.grade_class,
    created_at: p.created_at,
  }))

  return (
    <div>
      <header className="flex items-start justify-between gap-2 border-b border-border bg-surface px-4 py-3">
        <div>
          <h2 className="font-bold">사용자 관리</h2>
          <p className="text-xs text-muted-fg">
            {me.role === 'admin'
              ? '권한 변경/차단 모두 가능합니다.'
              : '모더는 권한 변경 권한이 제한될 수 있어요 (관리자만 admin 지정 가능).'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/admin/reports"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            신고 관리
          </Link>
          {me.role === 'admin' && (
            <Link
              href="/admin/words"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              금지어 관리
            </Link>
          )}
        </div>
      </header>
      <UserTable rows={rows} currentUserId={user.id} />
    </div>
  )
}
