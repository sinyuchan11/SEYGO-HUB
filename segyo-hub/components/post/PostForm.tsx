'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canModerate, type UserRole } from '@/lib/permissions'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { RichEditor } from '@/components/post/RichEditor'

type BoardKind = 'free' | 'qna' | 'notice'

const BOARD_OPTIONS: { value: BoardKind; label: string }[] = [
  { value: 'free', label: '자유게시판' },
  { value: 'qna', label: '질문' },
]

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function PostForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [board, setBoard] = useState<BoardKind>('free')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  // Fetch current user role to conditionally show 공지 option
  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('role, timeout_until')
        .eq('id', user.id)
        .single()
      if (data) setUserRole(data.role as UserRole)
    }
    fetchRole()
  }, [])

  const boardOptions =
    userRole && canModerate({ role: userRole, timeout_until: null })
      ? [...BOARD_OPTIONS, { value: 'notice' as BoardKind, label: '공지' }]
      : BOARD_OPTIONS

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (title.trim().length === 0 || stripHtml(content).length === 0) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
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
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-0 border-b border-border bg-transparent pb-2 text-xl font-bold placeholder-muted-fg focus:border-primary-600 focus:outline-none transition-colors"
        />
      </div>

      {/* Board + Anonymous row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Board selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-fg">게시판</span>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {boardOptions.map((opt) => (
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
      <RichEditor value={content} onChange={setContent} />

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="min-w-[120px]"
        >
          {loading ? '등록 중...' : '등록'}
        </Button>
      </div>
    </form>
  )
}
