import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostForm } from '@/components/post/PostForm'
import { fetchMentionMembers } from '@/lib/members'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  // author_id 는 클라이언트 역할로 읽을 수 없다(0027). 본인 여부는 post_view 의 is_mine 으로 본다.
  const { data: post } = await supabase.rpc('post_view', { p_post_id: postId }).maybeSingle<{
    id: number
    title: string
    content: string
    board: string
    is_anonymous: boolean
    is_mine: boolean
  }>()
  if (!post) notFound()

  // 수정은 작성자 본인만. 모더/관리자는 삭제·신고 처리로 대응한다
  // (남의 글 내용을 대신 고쳐 쓰는 건 별개 문제라 여기선 열지 않는다).
  if (!post.is_mine) redirect(`/post/${postId}`)

  // 글쓰기 폼은 자유/질문만 다룬다. 공지 게시판 글(레거시)은 여기서 고칠 수 없다.
  if (post.board !== 'free' && post.board !== 'qna') redirect(`/post/${postId}`)

  const members = await fetchMentionMembers(supabase)

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">글 수정</h1>
          <p className="mt-1 text-sm text-muted-fg">내용을 고치고 저장하세요</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-6 py-6 shadow-sm">
          <PostForm
            members={members}
            initial={{
              id: post.id,
              title: post.title,
              content: post.content,
              board: post.board,
              isAnonymous: post.is_anonymous,
            }}
          />
        </div>
      </div>
    </div>
  )
}
