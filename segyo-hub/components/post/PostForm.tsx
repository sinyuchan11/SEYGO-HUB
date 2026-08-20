'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildCheckText, checkContainsProfanity } from '@/lib/profanity'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { RichEditor } from '@/components/post/RichEditor'
import type { MentionMember } from '@/lib/mentions'

// 공지는 글쓰기로 작성하지 않는다(관리자 전용 info_cards로 이동). 여기선 자유/질문만.
type BoardKind = 'free' | 'qna'

const BOARD_OPTIONS: { value: BoardKind; label: string }[] = [
  { value: 'free', label: '자유게시판' },
  { value: 'qna', label: '질문' },
]

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}

/** 수정 모드일 때 넘어오는 기존 글. 없으면 새 글 작성. */
export type PostFormInitial = {
  id: number
  title: string
  content: string
  board: BoardKind
  isAnonymous: boolean
}

export function PostForm({
  members = [],
  initial,
}: {
  members?: MentionMember[]
  initial?: PostFormInitial
}) {
  const router = useRouter()
  const editing = initial != null
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [board, setBoard] = useState<BoardKind>(initial?.board ?? 'free')
  const [isAnonymous, setIsAnonymous] = useState(initial?.isAnonymous ?? false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [warned, setWarned] = useState(false)
  const [loading, setLoading] = useState(false)

  // 제목/내용이 바뀌면 이전 비속어 경고를 초기화한다 (변경분 재검사 유도).
  function clearWarning() {
    if (warned || warning) {
      setWarned(false)
      setWarning(null)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (title.trim().length === 0 || stripHtml(content).length === 0) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // 비속어 경고 (경고 후 마스킹): 처음 감지되면 등록을 보류하고 경고만 표시.
    // 사용자가 한 번 더 등록하면 진행하며, 저장 시 서버 트리거가 마스킹한다.
    if (!warned) {
      const hasProfanity = await checkContainsProfanity(supabase, buildCheckText(title, content))
      if (hasProfanity) {
        setWarning('비속어가 포함되어 있어요. 그대로 등록하면 해당 부분이 가려진 채 저장됩니다. 다시 한 번 눌러 등록하세요.')
        setWarned(true)
        setLoading(false)
        return
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    if (editing) {
      const { data, error: updateError } = await supabase
        .from('posts')
        .update({
          board,
          title: title.trim(),
          content,
          is_anonymous: isAnonymous,
        })
        .eq('id', initial.id)
        .select('id')
        // RLS 가 막으면 0행이 돌아온다. maybeSingle 이라야 그 경우를 에러가 아닌
        // null 로 받아서 아래에서 우리 문구로 안내할 수 있다.
        .maybeSingle()

      if (updateError || !data) {
        setError(updateError?.message ?? '수정 권한이 없어요.')
        setLoading(false)
        return
      }

      router.push(`/post/${initial.id}`)
      router.refresh()
      return
    }

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        board,
        title: title.trim(),
        content,
        is_anonymous: isAnonymous,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push(`/post/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <input
          type="text"
          required
          maxLength={100}
          placeholder="제목"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            clearWarning()
          }}
          className="w-full border-0 border-b border-border bg-transparent pb-2 text-xl font-bold placeholder-muted-fg focus:border-primary-600 focus:outline-none transition-colors"
        />
      </div>

      {/* Board + Anonymous row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Board selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-fg">게시판</span>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {BOARD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBoard(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  board === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface text-foreground hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Anonymous toggle */}
        <label className="flex cursor-pointer select-none items-center gap-2">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <div
              className={cn(
                'h-5 w-9 rounded-full transition-colors',
                isAnonymous ? 'bg-primary-600' : 'bg-border',
              )}
            />
            <div
              className={cn(
                'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                isAnonymous && 'translate-x-4',
              )}
            />
          </div>
          <span className="text-sm font-medium text-muted-fg">익명으로 작성</span>
        </label>
      </div>

      {/* Rich editor */}
      <RichEditor
        members={members}
        value={content}
        onChange={(v) => {
          setContent(v)
          clearWarning()
        }}
      />

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Profanity warning */}
      {warning && (
        <p className="rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground">
          {warning}
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2">
        {editing && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => router.push(`/post/${initial.id}`)}
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="min-w-[120px]"
        >
          {loading
            ? editing
              ? '저장 중...'
              : '등록 중...'
            : warned
              ? editing
                ? '그대로 저장'
                : '그대로 등록'
              : editing
                ? '저장'
                : '등록'}
        </Button>
      </div>
    </form>
  )
}
