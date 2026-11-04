import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type LookupRow = {
  id: number
  target_type: 'post' | 'comment'
  target_id: number
  post_id: number
  reason: string
  created_at: string
  admin: { nickname: string | null } | null
  author: { nickname: string | null } | null
}

const fmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// 익명 작성자 조회 기록(0029). admin 만 볼 수 있고, 기록은 앱에서 지우거나 고칠 수 없다.
export default async function AnonLookupsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/')

  const { data, error } = await supabase
    .from('anon_author_lookups')
    .select(`
      id, target_type, target_id, post_id, reason, created_at,
      admin:profiles!anon_author_lookups_admin_id_fkey ( nickname ),
      author:profiles!anon_author_lookups_author_id_fkey ( nickname )
    `)
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<LookupRow[]>()

  const rows = data ?? []

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
        <h2 className="text-lg font-bold text-foreground">익명 작성자 조회 기록</h2>
      </div>
      <p className="mb-4 text-sm text-muted-fg">
        관리자가 익명 글·댓글의 작성자를 확인할 때마다 남는 기록이에요. 최근 200건을 보여주며, 기록은 지울 수 없어요.
      </p>

      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">기록을 불러오지 못했어요: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted-fg">
          아직 조회 기록이 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-medium text-foreground">
                  {r.admin?.nickname ?? '(삭제된 관리자)'}
                  <span className="font-normal text-muted-fg"> 님이 </span>
                  <Link href={`/post/${r.post_id}`} className="text-primary-600 hover:underline">
                    {r.target_type === 'post' ? `글 #${r.target_id}` : `댓글 #${r.target_id} (글 #${r.post_id})`}
                  </Link>
                  <span className="font-normal text-muted-fg"> 작성자 확인 → </span>
                  {r.author?.nickname ?? '(삭제된 계정)'}
                </span>
                <time className="text-xs text-muted-fg">{fmt.format(new Date(r.created_at))}</time>
              </div>
              <p className="mt-1 text-xs text-muted-fg">사유: {r.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
