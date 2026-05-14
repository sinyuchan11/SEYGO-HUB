import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostListItem } from '@/components/post/PostListItem'

export default async function BoardPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, title, is_anonymous, created_at,
      author:profiles!posts_author_id_fkey ( nickname )
    `)
    .eq('board', 'free')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const ids = (posts ?? []).map((p) => p.id)
  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase.from('comments').select('post_id').in('post_id', ids).is('deleted_at', null),
    supabase.from('reactions').select('target_id').eq('target_type', 'post').in('target_id', ids),
  ])

  function count(arr: { post_id?: number; target_id?: number }[] | null, id: number, key: 'post_id' | 'target_id') {
    return (arr ?? []).filter((r) => r[key] === id).length
  }

  return (
    <main>
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <h2 className="font-bold">자유 게시판</h2>
        <Link href="/post/new" className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
          새 글
        </Link>
      </div>
      <ul>
        {(posts ?? []).map((p: any) => (
          <li key={p.id}>
            <PostListItem
              id={p.id}
              title={p.title}
              authorNickname={p.author?.nickname ?? null}
              isAnonymous={p.is_anonymous}
              createdAt={p.created_at}
              commentCount={count(comments, p.id, 'post_id')}
              likeCount={count(likes, p.id, 'target_id')}
            />
          </li>
        ))}
        {(posts ?? []).length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-500">
            아직 글이 없어요. 첫 글을 써보세요!
          </li>
        )}
      </ul>
    </main>
  )
}
