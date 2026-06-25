import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostListItem } from '@/components/post/PostListItem'
import { extractThumb, toExcerpt } from '@/lib/postPreview'
import { ZoomableImage } from '@/components/ui/ZoomableImage'

type AuthorRel = { nickname: string | null; avatar_url: string | null } | null
type PostRow = {
  id: number
  title: string
  content: string
  is_anonymous: boolean
  created_at: string
  author: AuthorRel
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

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, title, content, is_anonymous, created_at,
      author:profiles!posts_author_id_fkey ( nickname, avatar_url )
    `)
    .eq('board', 'free')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<PostRow[]>()

  const list = posts ?? []
  const ids = list.map((p) => p.id)
  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase.from('comments').select('post_id').in('post_id', ids).is('deleted_at', null),
    supabase.from('reactions').select('target_id').eq('target_type', 'post').in('target_id', ids),
  ])
  const count = (
    arr: { post_id?: number; target_id?: number }[] | null,
    id: number,
    key: 'post_id' | 'target_id',
  ) => (arr ?? []).filter((r) => r[key] === id).length

  const enriched = list.map((p) => ({
    post: p,
    commentCount: count(comments, p.id, 'post_id'),
    likeCount: count(likes, p.id, 'target_id'),
  }))
  const recent = enriched.slice(0, 5)
  const popular = [...enriched]
    .sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
    .filter((e) => e.likeCount + e.commentCount > 0)
    .slice(0, 3)

  const card = (e: (typeof enriched)[number]) => (
    <PostListItem
      id={e.post.id}
      title={e.post.title}
      authorNickname={e.post.author?.nickname ?? null}
      authorAvatarUrl={e.post.author?.avatar_url ?? null}
      isAnonymous={e.post.is_anonymous}
      createdAt={e.post.created_at}
      commentCount={e.commentCount}
      likeCount={e.likeCount}
      excerpt={toExcerpt(e.post.content)}
      thumbnailUrl={extractThumb(e.post.content)}
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
            emoji="🍴"
            title={meal?.title ?? '오늘의 식단'}
            body={meal?.body ?? null}
            imageUrl={meal?.image_url ?? null}
          />
          <InfoCard
            emoji="📅"
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
            <h3 className="text-sm font-bold text-foreground">🔥 인기글</h3>
            <Link href="/board?sort=popular" className="text-xs font-medium text-primary-600 hover:underline">
              더보기 →
            </Link>
          </div>
          <ul className="space-y-3">
            {popular.map((e) => (
              <li key={e.post.id}>{card(e)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent posts */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">🕒 최근 글</h3>
          <Link href="/board" className="text-xs font-medium text-primary-600 hover:underline">
            더보기 →
          </Link>
        </div>
        {recent.length > 0 ? (
          <ul className="space-y-3">
            {recent.map((e) => (
              <li key={e.post.id}>{card(e)}</li>
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
  emoji,
  title,
  body,
  imageUrl,
}: {
  emoji: string
  title: string
  body: string | null
  imageUrl: string | null
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
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
