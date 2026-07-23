import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BannedWordList, type BannedWord } from '@/components/admin/BannedWordList'

export default async function AdminWordsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // 금지어 관리는 admin 전용 (moderator 제외)
  if (me?.role !== 'admin') redirect('/')

  const { data } = await supabase
    .from('banned_words')
    .select('id, word, created_at')
    .order('word', { ascending: true })
    .returns<BannedWord[]>()

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
        <h2 className="text-lg font-bold text-foreground">금지어 관리</h2>
      </div>
      <p className="mb-4 text-sm text-muted-fg">
        여기 등록된 단어는 글·댓글 작성 시 자동으로 <code className="rounded bg-muted px-1">*</code> 로 가려집니다.
      </p>
      {data === null ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted-fg">
          금지어 목록을 불러오지 못했어요. 마이그레이션{' '}
          <code className="rounded bg-muted px-1">0012_profanity_filter.sql</code> 을 적용한 뒤 다시 열어주세요.
        </div>
      ) : (
        <BannedWordList initial={data} />
      )}
    </div>
  )
}
