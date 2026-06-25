import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostDetail, type PostDetailData } from '@/components/post/PostDetail'
import { canModerate, type UserRole } from '@/lib/permissions'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: me } = await supabase
    .from('profiles')
    .select('role, timeout_until')
    .eq('id', user.id)
    .single()

  const { data: post } = await supabase
    .from('posts')
    .select(`
      id, title, content, author_id, is_anonymous, created_at, deleted_at,
      author:profiles!posts_author_id_fkey ( nickname )
    `)
    .eq('id', postId)
    .single()
  if (!post || post.deleted_at) notFound()

  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id, post_id, author_id, parent_comment_id, content, is_anonymous, created_at, deleted_at,
      author:profiles!comments_author_id_fkey ( nickname, avatar_url )
    `)
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const commentIds = (comments ?? []).map((c: any) => c.id)
  const { data: postLikes } = await supabase
    .from('reactions')
    .select('user_id')
    .eq('target_type', 'post')
    .eq('target_id', postId)
  const { data: commentLikes } = await supabase
    .from('reactions')
    .select('user_id, target_id')
    .eq('target_type', 'comment')
    .in('target_id', commentIds.length > 0 ? commentIds : [-1])

  const initialPostLikeCount = (postLikes ?? []).length
  const initialPostLiked = (postLikes ?? []).some((r: any) => r.user_id === user.id)

  const commentLikeMap: Record<number, { liked: boolean; count: number }> = {}
  for (const id of commentIds) commentLikeMap[id] = { liked: false, count: 0 }
  for (const r of commentLikes ?? []) {
    const slot = commentLikeMap[(r as any).target_id]
    if (!slot) continue
    slot.count += 1
    if ((r as any).user_id === user.id) slot.liked = true
  }

  const data: PostDetailData = {
    id: post.id,
    title: post.title,
    content: post.content,
    authorId: post.author_id,
    authorNickname: (post as any).author?.nickname ?? null,
    isAnonymous: post.is_anonymous,
    createdAt: post.created_at,
    isMine: post.author_id === user.id,
    canModerate: canModerate({ role: (me?.role ?? 'pending') as UserRole, timeout_until: me?.timeout_until ?? null }),
    initialPostLiked,
    initialPostLikeCount,
    commentLikeMap,
    comments: (comments ?? []).map((c: any) => ({
      id: c.id,
      authorNickname: c.author?.nickname ?? null,
      authorAvatarUrl: c.author?.avatar_url ?? null,
      isAnonymous: c.is_anonymous,
      content: c.content,
      createdAt: c.created_at,
      parentId: c.parent_comment_id,
    })),
  }

  return <PostDetail data={data} />
}
