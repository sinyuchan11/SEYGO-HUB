'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CommentTree, type CommentNode } from '@/components/comment/CommentTree'
import { LikeButton } from '@/components/reactions/LikeButton'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { timeAgo } from '@/lib/time'
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
  const [deleteOpen, setDeleteOpen] = useState(false)

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

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/board')
    }
  }

  return (
    <main>
      {/* Back bar */}
      <div className="sticky top-0 z-20 flex items-center border-b border-border bg-surface/90 px-2 py-2 backdrop-blur">
        <button
          type="button"
          onClick={goBack}
          aria-label="뒤로가기"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          뒤로
        </button>
      </div>

      <article className="border-b bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold">{data.title}</h1>
          {(data.isMine || data.canModerate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="더보기"
                  className="-mr-1 shrink-0 rounded-md p-1.5 text-muted-fg hover:bg-muted"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="19" cy="12" r="1.6" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="text-danger data-[highlighted]:bg-danger/10"
                >
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="mt-1 flex gap-2 text-xs text-gray-500">
          <span>{data.isAnonymous ? '익명' : (data.authorNickname ?? '?')}</span>
          <span suppressHydrationWarning>{timeAgo(data.createdAt)}</span>
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
        </div>
      </article>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogTitle className="text-base font-bold text-foreground">
            이 글을 삭제할까요?
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-fg">
            삭제하면 되돌릴 수 없어요.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-border"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(false)
                deletePost()
              }}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              삭제
            </button>
          </div>
        </DialogContent>
      </Dialog>

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
                <button onClick={() => setReplyTo(c.id)} className="font-medium text-primary-600 hover:text-primary-700">
                  답글
                </button>
              )}
            </div>
          )
        }}
      />

      <div className="sticky bottom-16 border-t border-border bg-surface px-4 py-3 shadow-[0_-1px_0_0_var(--color-border)]">
        {replyTo !== null && (
          <p className="mb-2 flex items-center gap-1 text-xs text-muted-fg">
            <span>답글 작성 중</span>
            <span className="text-border">·</span>
            <button
              onClick={() => setReplyTo(null)}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              취소
            </button>
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={replyTo !== null ? '답글을 입력하세요' : '댓글을 입력하세요'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
            className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-sm text-foreground placeholder:text-muted-fg focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            onClick={submitComment}
            disabled={submitting || !text.trim()}
            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
          >
            등록
          </button>
        </div>
        {commentError && <p className="mt-1.5 text-xs text-danger">{commentError}</p>}
      </div>
    </main>
  )
}
