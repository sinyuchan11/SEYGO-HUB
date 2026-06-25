import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostListItem } from '@/components/post/PostListItem'

/** First <img> src in the post HTML, used as a list thumbnail. */
function extractThumb(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return m ? m[1] : null
}

/** Strip HTML to a short plain-text excerpt for the list preview. */
function toExcerpt(html: string, max = 140): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

type AuthorRel = { nickname: string | null; avatar_url: string | null } | null
type PostRow = {
  id: number
  title: string
  content: string
  is_anonymous: boolean
  created_at: string
  author: AuthorRel
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const sort = sp.sort === 'popular' ? 'popular' : 'latest'

  const supabase = await createClient()
  let qb = supabase
    .from('posts')
    .select(`
      id, title, content, is_anonymous, created_at,
      author:profiles!posts_author_id_fkey ( nickname, avatar_url )
    `)
    .eq('board', 'free')
    .is('deleted_at', null)
  if (q) qb = qb.ilike('title', `%${q}%`)
  const { data: posts } = await qb
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<PostRow[]>()

  const ids = (posts ?? []).map((p) => p.id)
  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase.from('comments').select('post_id').in('post_id', ids).is('deleted_at', null),
    supabase.from('reactions').select('target_id').eq('target_type', 'post').in('target_id', ids),
  ])

  function count(
    arr: { post_id?: number; target_id?: number }[] | null,
    id: number,
    key: 'post_id' | 'target_id',
  ) {
    return (arr ?? []).filter((r) => r[key] === id).length
  }

  let items = (posts ?? []).map((p) => ({
    post: p,
    commentCount: count(comments, p.id, 'post_id'),
    likeCount: count(likes, p.id, 'target_id'),
  }))
  if (sort === 'popular') {
    items = items.sort(
      (a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount),
    )
  }

  // Build sort-tab hrefs while preserving the search query.
  const qSuffix = q ? `&q=${encodeURIComponent(q)}` : ''
  const tab = (key: 'latest' | 'popular', label: string) => {
    const active = sort === key
    return (
      <Link
        href={`/board?sort=${key}${qSuffix}`}
        className={
          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
          (active
            ? 'bg-primary-600 text-white'
            : 'text-muted-fg hover:bg-muted')
        }
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="px-3 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-4 pt-1">
        <h2 className="text-xl font-bold text-foreground">자유 게시판</h2>
        <p className="mt-0.5 text-sm text-muted-fg">자유롭게 이야기를 나눠보세요</p>
      </div>

      {/* Search */}
      <form action="/board" method="get" className="mb-3">
        <input type="hidden" name="sort" value={sort} />
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-fg" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="제목 검색"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-fg"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700">
            검색
          </button>
        </div>
      </form>

      {/* Sort tabs + count */}
      <div className="mb-3 flex items-center gap-1.5">
        {tab('latest', '최신순')}
        {tab('popular', '인기순')}
        <span className="ml-auto text-xs text-muted-fg">{items.length}개의 글</span>
      </div>

      {/* Feed */}
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map(({ post, commentCount, likeCount }) => (
            <li key={post.id}>
              <PostListItem
                id={post.id}
                title={post.title}
                authorNickname={post.author?.nickname ?? null}
                authorAvatarUrl={post.author?.avatar_url ?? null}
                isAnonymous={post.is_anonymous}
                createdAt={post.created_at}
                commentCount={commentCount}
                likeCount={likeCount}
                excerpt={toExcerpt(post.content)}
                thumbnailUrl={extractThumb(post.content)}
              />
            </li>
          ))}
        </ul>
      ) : q ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <p className="text-2xl">🔍</p>
          <p className="mt-2 font-medium text-foreground">‘{q}’ 검색 결과가 없어요</p>
          <p className="mt-1 text-sm text-muted-fg">다른 검색어로 찾아보세요.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <p className="text-2xl">📝</p>
          <p className="mt-2 font-medium text-foreground">아직 글이 없어요</p>
          <p className="mt-1 text-sm text-muted-fg">첫 글을 써서 이야기를 시작해보세요!</p>
          <Link
            href="/post/new"
            className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            글쓰기
          </Link>
        </div>
      )}

      {/* Floating action button */}
      <Link
        href="/post/new"
        aria-label="새 글 쓰기"
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-transform hover:scale-105 hover:bg-primary-700 md:bottom-8 md:right-8"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        글쓰기
      </Link>
    </div>
  )
}
