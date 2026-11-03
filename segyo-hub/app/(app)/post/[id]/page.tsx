import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostDetail, type PostDetailData } from '@/components/post/PostDetail'
import { canModerate, type UserRole } from '@/lib/permissions'
import { fetchMentionMembers } from '@/lib/members'

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

  // 작성자 정보는 post_view/post_comments 로만 받는다(0027). 익명이면 작성자가 비어서 오고,
  // 본인 여부만 is_mine 으로 알려준다. 여기서 받은 값은 그대로 클라이언트로 직렬화되므로
  // 익명 작성자의 id·닉네임을 절대 담지 말 것.
  const { data: post } = await supabase.rpc('post_view', { p_post_id: postId }).maybeSingle<{
    id: number
    title: string
    content: string
    board: string
    is_anonymous: boolean
    created_at: string
    author_id: string | null
    author_nickname: string | null
    is_mine: boolean
  }>()
  if (!post) notFound()

  const { data: commentRows } = await supabase.rpc('post_comments', { p_post_id: postId })
  const comments = (commentRows ?? []) as {
    id: number
    parent_comment_id: number | null
    content: string
    is_anonymous: boolean
    created_at: string
    author_nickname: string | null
    author_avatar_url: string | null
    is_mine: boolean
    is_post_author: boolean
  }[]

  const commentIds = (comments ?? []).map((c) => c.id)
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

  const members = await fetchMentionMembers(supabase)

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
    authorNickname: post.author_nickname,
    isAnonymous: post.is_anonymous,
    createdAt: post.created_at,
    isMine: post.is_mine,
    canEdit: post.board === 'free' || post.board === 'qna',
    canModerate: canModerate({ role: (me?.role ?? 'pending') as UserRole, timeout_until: me?.timeout_until ?? null }),
    initialPostLiked,
    initialPostLikeCount,
    commentLikeMap,
    members,
    comments: (comments ?? []).map((c) => ({
      id: c.id,
      authorNickname: c.author_nickname,
      authorAvatarUrl: c.author_avatar_url,
      isAnonymous: c.is_anonymous,
      content: c.content,
      createdAt: c.created_at,
      parentId: c.parent_comment_id,
      isMine: c.is_mine,
      isPostAuthor: c.is_post_author,
    })),
  }

  return <PostDetail data={data} />
}
