'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ShieldAlertIcon } from '@/components/ui/icons'

const REASONS = ['신고 처리', '욕설/괴롭힘 조사', '개인정보 노출 조사', '기타'] as const

type Revealed = {
  author_id: string
  nickname: string | null
  grade_class: string | null
  avatar_url: string | null
  role: string
}

/**
 * 관리자 전용: 익명 글/댓글의 실제 작성자 확인.
 * 사유를 받아 admin_reveal_anon_author() 를 부르고, 그 호출이 조회 기록을 남긴다(0029).
 * 권한 검사도 DB 함수가 한다 — 이 컴포넌트를 숨기는 건 화면 정리일 뿐이다.
 */
export function RevealAuthorDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: 'post' | 'comment'
  targetId: number
}) {
  const [reason, setReason] = useState<string>(REASONS[0])
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Revealed | null>(null)

  function reset() {
    setReason(REASONS[0])
    setDetail('')
    setError(null)
    setResult(null)
    setSubmitting(false)
  }

  const fullReason = detail.trim() ? `${reason}: ${detail.trim()}` : reason
  const needsDetail = reason === '기타' && detail.trim().length < 2

  async function submit() {
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('admin_reveal_anon_author', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: fullReason,
    })
    setSubmitting(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    const row = (data as Revealed[] | null)?.[0]
    if (!row) {
      setError('작성자 계정이 삭제됐어요.')
      return
    }
    setResult(row)
  }

  const what = targetType === 'post' ? '글' : '댓글'

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent>
        {result ? (
          <>
            <DialogTitle className="text-base font-bold text-foreground">익명 {what} 작성자</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-fg">
              이 조회는 기록에 남았어요.
            </DialogDescription>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-canvas p-3">
              <Avatar name={result.nickname ?? '?'} src={result.avatar_url} size={40} />
              <div className="min-w-0">
                <Link
                  href={`/u/${result.author_id}`}
                  className="font-semibold text-foreground hover:text-primary-600 hover:underline"
                >
                  {result.nickname ?? '(닉네임 없음)'}
                </Link>
                <p className="text-xs text-muted-fg">
                  {result.grade_class ?? '학년·반 미입력'} · {result.role}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => onOpenChange(false)}>닫기</Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle className="flex items-center gap-1.5 text-base font-bold text-foreground">
              <ShieldAlertIcon size={18} className="text-danger" />
              익명 {what} 작성자 확인
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-fg">
              조회할 때마다 관리자·시각·사유가 기록되고, 기록은 지울 수 없어요.
              꼭 필요한 경우에만 조회해 주세요.
            </DialogDescription>

            <div className="mt-3 space-y-1.5">
              {REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                  <input
                    type="radio"
                    name="reveal-reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-primary-600"
                  />
                  <span className="text-sm text-foreground">{r}</span>
                </label>
              ))}
            </div>

            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder={reason === '기타' ? '사유를 적어 주세요 (필수)' : '자세한 사유 (선택, 예: 신고 #12)'}
              className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-fg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />

            {error && <p className="mt-2 text-sm text-danger">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-border"
              >
                취소
              </button>
              <Button variant="danger" onClick={submit} disabled={submitting || needsDetail}>
                {submitting ? '조회 중…' : '기록 남기고 조회'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
