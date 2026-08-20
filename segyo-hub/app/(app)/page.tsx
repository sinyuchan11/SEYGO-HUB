import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostListItem } from '@/components/post/PostListItem'
import { extractThumb, toExcerpt } from '@/lib/postPreview'
import { ZoomableImage } from '@/components/ui/ZoomableImage'
import { FlameIcon, ClockIcon, UtensilsIcon, CalendarIcon, MegaphoneIcon } from '@/components/ui/icons'

/** board_posts() 한 행. */
type PostRow = {
  id: number
  title: string
  content: string
  is_anonymous: boolean
  created_at: string
  author_nickname: string | null
  author_avatar_url: string | null
  comment_count: number
  like_count: number
  total_count: number
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: me } = user
    ? await supabase.from('profiles').select('nickname, role').eq('id', user.id).single()
    : { data: null }
  const nickname = me?.nickname ?? '친구'
  const isAdmin = me?.role === 'admin'

  // Info cards (meal / schedule). Gracefully degrades if the table isn't applied yet.
  const { data: infoCards } = await supabase
    .from('info_cards')
    .select('key, title, body, image_url')
  const meal = infoCards?.find((c) => c.key === 'meal') ?? null
  const schedule = infoCards?.find((c) => c.key === 'schedule') ?? null
  const notice = infoCards?.find((c) => c.key === 'notice') ?? null
  const hasNotice = !!(notice && (notice.body || notice.image_url))

  // 정렬·집계는 DB 에서. 예전엔 최근 50건만 받아 JS 로 정렬해서 오래된 인기글이
  // 인기 코너에 절대 못 올라왔다.
  const [{ data: recentRows }, { data: popularRows }] = await Promise.all([
    supabase.rpc('board_posts', {
      p_board: 'free', p_q: '', p_sort: 'latest', p_limit: 5, p_offset: 0,
    }),
    supabase.rpc('board_posts', {
      p_board: 'free', p_q: '', p_sort: 'popular', p_limit: 3, p_offset: 0,
    }),
  ])

  const recent = (recentRows ?? []) as PostRow[]
  // 인기 코너는 반응이 하나라도 있는 글만 (아무도 안 본 글을 "인기"로 띄우지 않는다).
  const popular = ((popularRows ?? []) as PostRow[]).filter(
    (p) => p.like_count + p.comment_count > 0,
  )

  const card = (p: PostRow) => (
    <PostListItem
      id={p.id}
      title={p.title}
      authorNickname={p.author_nickname}
      authorAvatarUrl={p.author_avatar_url}
      isAnonymous={p.is_anonymous}
      createdAt={p.created_at}
      commentCount={p.comment_count}
      likeCount={p.like_count}
      excerpt={toExcerpt(p.content)}
      thumbnailUrl={extractThumb(p.content)}
    />
  )

  return (
    <div className="space-y-6 px-3 pb-24 pt-1 md:pb-8">
      {/* Welcome banner */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 p-5 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Segyo Hub" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">안녕하세요, {nickname}님 👋</p>
            <p className="text-sm text-white/85">오늘은 어떤 이야기를 나눠볼까요?</p>
          </div>
        </div>
      </section>

      {/* 공지 (admin-managed via /admin/info; shown when there's content) */}
      {(hasNotice || isAdmin) && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <MegaphoneIcon size={16} className="text-primary-600" /> 공지
            </h3>
            {isAdmin && (
              <Link href="/admin/info" className="text-xs font-medium text-primary-600 hover:underline">
                편집
              </Link>
            )}
          </div>
          <InfoCard
            icon={<MegaphoneIcon size={18} className="text-primary-600" />}
            title={notice?.title ?? '공지'}
            body={notice?.body ?? null}
            imageUrl={notice?.image_url ?? null}
          />
        </section>
      )}

      {/* Search */}
      <form action="/board" method="get">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-fg" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            name="q"
            placeholder="무엇이든 검색해보세요"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-fg"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700">
            검색
          </button>
        </div>
      </form>

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-3">
        <QuickAction href="/post/new" label="글쓰기" tone="primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </QuickAction>
        <QuickAction href="/board" label="게시판" tone="muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" />
            <line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" />
          </svg>
        </QuickAction>
        <QuickAction href="/me" label="내정보" tone="muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </QuickAction>
      </section>

      {/* Meal plan / schedule cards (admin-editable) */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">오늘의 정보</h3>
          {isAdmin && (
            <Link href="/admin/info" className="text-xs font-medium text-primary-600 hover:underline">
              편집
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoCard
            icon={<UtensilsIcon size={18} className="text-primary-600" />}
            title={meal?.title ?? '오늘의 식단'}
            body={meal?.body ?? null}
            imageUrl={meal?.image_url ?? null}
          />
          <InfoCard
            icon={<CalendarIcon size={18} className="text-primary-600" />}
            title={schedule?.title ?? '일정표'}
            body={schedule?.body ?? null}
            imageUrl={schedule?.image_url ?? null}
          />
        </div>
      </section>

      {/* Popular posts */}
      {popular.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <FlameIcon size={16} className="text-primary-600" /> 인기글
            </h3>
            <Link href="/board?sort=popular" className="text-xs font-medium text-primary-600 hover:underline">
              더보기 →
            </Link>
          </div>
          <ul className="space-y-3">
            {popular.map((p) => (
              <li key={p.id}>{card(p)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent posts */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <ClockIcon size={16} className="text-primary-600" /> 최근 글
          </h3>
          <Link href="/board" className="text-xs font-medium text-primary-600 hover:underline">
            더보기 →
          </Link>
        </div>
        {recent.length > 0 ? (
          <ul className="space-y-3">
            {recent.map((p) => (
              <li key={p.id}>{card(p)}</li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted-fg">
            아직 글이 없어요. 첫 글을 써보세요!
          </div>
        )}
      </section>
    </div>
  )
}

function QuickAction({
  href,
  label,
  tone,
  children,
}: {
  href: string
  label: string
  tone: 'primary' | 'muted'
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
    >
      <span
        className={
          'flex h-11 w-11 items-center justify-center rounded-full ' +
          (tone === 'primary' ? 'bg-primary-600 text-white' : 'bg-muted text-foreground')
        }
      >
        {children}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  )
}

function InfoCard({
  icon,
  title,
  body,
  imageUrl,
}: {
  icon: React.ReactNode
  title: string
  body: string | null
  imageUrl: string | null
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
      </div>
      {imageUrl && (
        <ZoomableImage
          src={imageUrl}
          alt={title}
          className="mt-3 max-h-72 w-full rounded-xl border border-border bg-canvas object-contain"
        />
      )}
      {body && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{body}</p>}
      {!imageUrl && !body && (
        <div className="mt-3 flex min-h-[72px] items-center justify-center rounded-xl bg-canvas text-center text-xs text-muted-fg">
          아직 등록된 내용이 없어요
        </div>
      )}
    </div>
  )
}
