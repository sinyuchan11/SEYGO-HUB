import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { InfoCardsEditor, type InfoCardRow } from '@/components/admin/InfoCardsEditor'

export default async function AdminInfoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (me?.role !== 'admin') redirect('/')

  const { data: cards } = await supabase
    .from('info_cards')
    .select('key, title, body')
    .order('key')
  const rows = (cards ?? []) as InfoCardRow[]

  return (
    <div className="px-3 py-2 pb-24 md:pb-8">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/"
          aria-label="뒤로"
          className="-ml-1 inline-flex rounded-lg p-1.5 text-muted-fg hover:bg-muted"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h2 className="text-lg font-bold text-foreground">오늘의 정보 편집</h2>
          <p className="text-xs text-muted-fg">홈 화면의 식단표·일정표 내용을 관리해요.</p>
        </div>
      </div>

      {rows.length > 0 ? (
        <InfoCardsEditor initial={rows} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted-fg">
          아직 <code className="rounded bg-muted px-1">info_cards</code> 테이블이 없어요. 마이그레이션
          <code className="rounded bg-muted px-1">0009_info_cards.sql</code> 을 적용한 뒤 다시 열어주세요.
        </div>
      )}
    </div>
  )
}
