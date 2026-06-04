import { redirect } from 'next/navigation'
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
    <main>
      <header className="border-b border-border bg-surface px-4 py-3">
        <h2 className="font-bold">사용자 관리</h2>
        <p className="text-xs text-gray-500">
          {me.role === 'admin'
            ? '권한 변경/차단 모두 가능합니다.'
            : '모더는 권한 변경 권한이 제한될 수 있어요 (관리자만 admin 지정 가능).'}
        </p>
      </header>
      <UserTable rows={rows} currentUserId={user.id} />
    </main>
  )
}
