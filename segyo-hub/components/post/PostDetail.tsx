'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CommentTree, type CommentNode } from '@/components/comment/CommentTree'
import { LikeButton } from '@/components/reactions/LikeButton'
import DOMPurify from 'isomorphic-dompurify'

export type PostDetailData = {
  id: number
  title: string
  content: string
  authorId: string
  authorNickname: string | null
  isAnonymous: boolean
  createdAt: string
  isMine: boolean
  canModerate: boolean
  initialPostLiked: boolean
  initialPostLikeCount: number
  commentLikeMap: Record<number, { liked: boolean; count: number }>
  comments: CommentNode[]
}

export function PostDetail({ data }: { data: PostDetailData }) {
  const router = useRouter()
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function submitComment() {
    if (!text.trim()) return
    setCommentError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { error } = await supabase.from('comments').insert({
      post_id: data.id,
      author_id: user.id,
      parent_comment_id: replyTo,
      content: text.trim(),
    })
    setSubmitting(false)
    if (error) {
      setCommentError(error.message)
      return
    }
    setText('')
    setReplyTo(null)
    router.refresh()
  }

  async function deletePost() {
    const supabase = createClient()
    await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    router.push('/board')
    router.refresh()
  }

  return (
    <main>
      <article className="border-b bg-white px-4 py-4">
        <h1 className="text-lg font-bold">{data.title}</h1>
        <div className="mt-1 flex gap-2 text-xs text-gray-500">
          <span>{data.isAnonymous ? '익명' : (data.authorNickname ?? '?')}</span>
          <span>{new Date(data.createdAt).toLocaleString('ko-KR')}</span>
        </div>
        <div
          className="post-content mt-3"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content, { USE_PROFILES: { html: true } }) }}
        />
        <div className="mt-3 flex items-center gap-3">
          <LikeButton
            targetType="post"
            targetId={data.id}
            initialLiked={data.initialPostLiked}
            initialCount={data.initialPostLikeCount}
          />
          {(data.isMine || data.canModerate) &&
            (confirmingDelete ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted-fg">삭제할까요?</span>
                <button onClick={deletePost} className="font-medium text-danger">
                  삭제
                </button>
                <button onClick={() => setConfirmingDelete(false)} className="text-muted-fg">
                  취소
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmingDelete(true)} className="text-xs text-red-600">
                삭제
              </button>
            ))}
        </div>
      </article>

      <CommentTree
        comments={data.comments}
        renderActions={(c) => {
          const lk = data.commentLikeMap[c.id] ?? { liked: false, count: 0 }
          return (
            <div className="flex gap-3 text-xs">
              <LikeButton
                targetType="comment"
                targetId={c.id}
                initialLiked={lk.liked}
                initialCount={lk.count}
                small
              />
              {c.parentId === null && (
                <button onClick={() => setReplyTo(c.id)} className="text-blue-600">
                  답글
                </button>
              )}
            </div>
          )
        }}
      />

      <div className="sticky bottom-16 border-t bg-white p-3">
        {replyTo !== null && (
          <p className="mb-1 text-xs text-gray-500">
            답글 작성 중 ·{' '}
            <button onClick={() => setReplyTo(null)} className="text-blue-600">
              취소
            </button>
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={replyTo !== null ? '답글 입력' : '댓글 입력'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={submitComment}
            disabled={submitting || !text.trim()}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            등록
          </button>
        </div>
        {commentError && <p className="mt-1 text-xs text-danger">{commentError}</p>}
      </div>
    </main>
  )
}
