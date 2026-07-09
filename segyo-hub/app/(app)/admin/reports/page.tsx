import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReportList, type ReportRow } from '@/components/admin/ReportList'

type ReportRecord = {
  id: number
  target_type: 'post' | 'comment'
  target_id: number
  reason: string
  detail: string | null
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
  reporter: { nickname: string | null } | null
}

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin' && me?.role !== 'moderator') redirect('/')

  const { data } = await supabase
    .from('reports')
    .select(`
      id, target_type, target_id, reason, detail, status, created_at,
      reporter:profiles!reports_reporter_id_fkey ( nickname )
    `)
    .order('created_at', { ascending: false })
    .returns<ReportRecord[]>()

  const rows: ReportRow[] = (data ?? []).map((r) => ({
    id: r.id,
    reporterNickname: r.reporter?.nickname ?? null,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    createdAt: r.created_at,
  }))

  return (
    <div className="px-3 py-2 pb-24 md:pb-8">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/admin/users"
          aria-label="뒤로"
          className="-ml-1 inline-flex rounded-lg p-1.5 text-muted-fg hover:bg-muted"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h2 className="text-lg font-bold text-foreground">신고 관리</h2>
      </div>
      {data === null ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted-fg">
          신고 목록을 불러오지 못했어요. 마이그레이션{' '}
          <code className="rounded bg-muted px-1">0011_reports.sql</code> 을 적용한 뒤 다시 열어주세요.
        </div>
      ) : (
        <ReportList initial={rows} />
      )}
    </div>
  )
}
