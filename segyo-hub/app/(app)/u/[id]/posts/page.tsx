import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostListItem } from '@/components/post/PostListItem'
import { extractThumb, toExcerpt } from '@/lib/postPreview'
import { FileTextIcon } from '@/components/ui/icons'

const PAGE_SIZE = 20

type Row = {
  id: number
  title: string
  content: string
  is_anonymous: boolean
  created_at: string
}

export default async function UserPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('id', id)
    .maybeSingle()
  if (!profile) notFound()

  // 익명 글은 제외한다. 프로필의 '게시글' 수(get_profile_with_stats)도 익명을 빼고 세므로
  // 숫자와 목록이 어긋나지 않고, 익명으로 쓴 글의 작성자가 드러나지도 않는다.
  const { data: posts, count } = await supabase
    .from('posts')
    .select('id, title, content, is_anonymous, created_at', { count: 'exact' })
    .eq('author_id', id)
    .eq('is_anonymous', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)
    .returns<Row[]>()

  const list = posts ?? []
  const total = count ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // 범위 밖 페이지면 첫 페이지로. 그냥 두면 "아직 쓴 글이 없어요" 가 떠서
  // 글이 있는데도 없는 것처럼 보인다.
  if (page > lastPage) redirect(`/u/${id}/posts`)

  // 이 페이지에 실린 글만 세면 된다. 최신순 고정이라 잘린 집합에서 정렬할 일이 없다.
  const ids = list.map((p) => p.id)
  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase.from('comments').select('post_id').in('post_id', ids.length ? ids : [-1]).is('deleted_at', null),
    supabase.from('reactions').select('target_id').eq('target_type', 'post').in('target_id', ids.length ? ids : [-1]),
  ])
  const countBy = (
    arr: { post_id?: number; target_id?: number }[] | null,
    pid: number,
    key: 'post_id' | 'target_id',
  ) => (arr ?? []).filter((r) => r[key] === pid).length

  const isMe = id === user.id
  const who = profile.nickname ?? '이름 없음'

  return (
    <div className="px-3 py-2 pb-24 md:pb-8">
      <div className="mb-4 pt-1">
        <Link
          href={isMe ? '/me' : `/u/${id}`}
          className="text-xs font-medium text-primary-600 hover:underline"
        >
          ← 프로필로
        </Link>
        <h1 className="mt-1 text-lg font-bold text-foreground">
          {isMe ? '내가 쓴 글' : `${who}님이 쓴 글`}
        </h1>
        <p className="mt-0.5 text-sm text-muted-fg">{total}개의 글</p>
      </div>

      {list.length > 0 ? (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id}>
              <PostListItem
                id={p.id}
                title={p.title}
                authorNickname={profile.nickname}
                isAnonymous={false}
                createdAt={p.created_at}
                commentCount={countBy(comments, p.id, 'post_id')}
                likeCount={countBy(likes, p.id, 'target_id')}
                excerpt={toExcerpt(p.content)}
                thumbnailUrl={extractThumb(p.content)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <FileTextIcon size={32} className="mx-auto text-muted-fg" />
          <p className="mt-2 font-medium text-foreground">아직 쓴 글이 없어요</p>
          <p className="mt-1 text-sm text-muted-fg">익명으로 쓴 글은 여기에 보이지 않아요.</p>
        </div>
      )}

      {lastPage > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2" aria-label="페이지">
          <Link
            href={`/u/${id}/posts${page - 1 > 1 ? `?page=${page - 1}` : ''}`}
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
            href={`/u/${id}/posts?page=${page + 1}`}
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
    </div>
  )
}
