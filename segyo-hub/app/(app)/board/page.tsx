import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostListItem, PostListRow } from '@/components/post/PostListItem'
import { extractThumb, toExcerpt } from '@/lib/postPreview'
import { SearchIcon, FileTextIcon, GridIcon, ListIcon } from '@/components/ui/icons'
import { BOARD_TABS, parseBoard, boardHeading, boardEmptyText } from '@/lib/board'

/** 한 페이지에 보여줄 글 수. */
const PAGE_SIZE = 20

type BoardRow = {
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

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string; board?: string; view?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const sort = sp.sort === 'popular' ? 'popular' : 'latest'
  const view = sp.view === 'list' ? 'list' : 'card'
  const board = parseBoard(sp.board)
  const heading = boardHeading(board)
  const page = Math.max(1, Number(sp.page) || 1)

  const supabase = await createClient()
  // 세기·정렬·페이징을 DB 에서 한다. JS 로 정렬하면 가져온 페이지 안에서만
  // 정렬돼 "인기순"이 실제 인기순이 아니게 된다.
  const { data } = await supabase.rpc('board_posts', {
    p_board: board,
    p_q: q,
    p_sort: sort,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  })

  const items = (data ?? []) as BoardRow[]
  // 총계는 행에 실려 온다. 범위 밖 페이지는 0행이라 총계도 못 받는데, 그대로 두면
  // "아직 글이 없어요" 빈 화면에 페이지 네비게이션까지 사라져 돌아갈 길이 없어진다.
  // (글이 지워져 마지막 페이지가 줄어든 뒤 새로고침하면 실제로 걸린다.)
  const total = items[0]?.total_count ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Build hrefs while preserving the other controls.
  const href = (over: Partial<{ board: string; sort: string; view: string; page: number }>) => {
    const p = new URLSearchParams()
    p.set('board', over.board ?? board)
    p.set('sort', over.sort ?? sort)
    if ((over.view ?? view) === 'list') p.set('view', 'list')
    if (q) p.set('q', q)
    const pg = over.page ?? 1
    if (pg > 1) p.set('page', String(pg))
    return `/board?${p.toString()}`
  }

  // 범위 밖 페이지면 첫 페이지로 돌려보낸다 (위 total 주석 참고).
  if (items.length === 0 && page > 1) redirect(href({ page: 1 }))

  const pill = (active: boolean) =>
    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
    (active ? 'bg-primary-600 text-white' : 'text-muted-fg hover:bg-muted')

  // Category tabs switch board, keeping sort + query. 페이지는 1로 되돌린다.
  const catTab = (key: (typeof BOARD_TABS)[number]['key'], label: string) => (
    <Link href={href({ board: key })} className={pill(board === key)}>
      {label}
    </Link>
  )

  const tab = (key: 'latest' | 'popular', label: string) => (
    <Link href={href({ sort: key })} className={pill(sort === key)}>
      {label}
    </Link>
  )

  const viewBtn = (key: 'card' | 'list', label: string, Icon: typeof GridIcon) => (
    <Link
      href={href({ view: key, page })}
      aria-label={label}
      title={label}
      className={
        'rounded-lg p-1.5 transition-colors ' +
        (view === key ? 'bg-primary-600 text-white' : 'text-muted-fg hover:bg-muted')
      }
    >
      <Icon size={16} />
    </Link>
  )

  return (
    <div className="px-3 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-4 pt-1">
        <h2 className="text-xl font-bold text-foreground">{heading.title}</h2>
        <p className="mt-0.5 text-sm text-muted-fg">{heading.subtitle}</p>
      </div>

      {/* Category tabs */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {BOARD_TABS.map((t) => (
          <span key={t.key}>{catTab(t.key, t.label)}</span>
        ))}
      </div>

      {/* Search */}
      <form action="/board" method="get" className="mb-3">
        <input type="hidden" name="board" value={board} />
        <input type="hidden" name="sort" value={sort} />
        {view === 'list' && <input type="hidden" name="view" value="list" />}
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

      {/* Sort tabs + view toggle + count */}
      <div className="mb-3 flex items-center gap-1.5">
        {tab('latest', '최신순')}
        {tab('popular', '인기순')}
        <span className="ml-auto text-xs text-muted-fg">{total}개의 글</span>
        <div className="ml-2 flex items-center gap-1">
          {viewBtn('card', '카드 보기', GridIcon)}
          {viewBtn('list', '목록 보기', ListIcon)}
        </div>
      </div>

      {/* Feed */}
      {items.length > 0 ? (
        view === 'list' ? (
          <div className="rounded-2xl border border-border bg-surface px-3 py-1">
            {items.map((p) => (
              <PostListRow
                key={p.id}
                id={p.id}
                title={p.title}
                authorNickname={p.author_nickname}
                authorAvatarUrl={p.author_avatar_url}
                isAnonymous={p.is_anonymous}
                createdAt={p.created_at}
                commentCount={p.comment_count}
                likeCount={p.like_count}
              />
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => (
              <li key={p.id}>
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
              </li>
            ))}
          </ul>
        )
      ) : q ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <SearchIcon size={32} className="mx-auto text-muted-fg" />
          <p className="mt-2 font-medium text-foreground">‘{q}’ 검색 결과가 없어요</p>
          <p className="mt-1 text-sm text-muted-fg">다른 검색어로 찾아보세요.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <FileTextIcon size={32} className="mx-auto text-muted-fg" />
          <p className="mt-2 font-medium text-foreground">{boardEmptyText(board)}</p>
          <p className="mt-1 text-sm text-muted-fg">첫 글을 써서 이야기를 시작해보세요!</p>
          <Link
            href="/post/new"
            className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            글쓰기
          </Link>
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2" aria-label="페이지">
          <Link
            href={href({ page: page - 1 })}
            aria-disabled={page === 1}
            className={
              'rounded-lg border border-border px-3 py-1.5 text-sm font-medium ' +
              (page === 1
                ? 'pointer-events-none text-muted-fg opacity-40'
                : 'text-foreground hover:bg-muted')
            }
          >
            이전
          </Link>
          <span className="text-sm text-muted-fg">
            {page} / {lastPage}
          </span>
          <Link
            href={href({ page: page + 1 })}
            aria-disabled={page === lastPage}
            className={
              'rounded-lg border border-border px-3 py-1.5 text-sm font-medium ' +
              (page === lastPage
                ? 'pointer-events-none text-muted-fg opacity-40'
                : 'text-foreground hover:bg-muted')
            }
          >
            다음
          </Link>
        </nav>
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
