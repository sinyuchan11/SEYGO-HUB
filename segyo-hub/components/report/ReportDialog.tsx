'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'

const REASONS = ['스팸/광고', '욕설/비방', '음란물', '개인정보 노출', '기타'] as const

export function ReportDialog({
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
  const [done, setDone] = useState(false)

  function reset() {
    setReason(REASONS[0])
    setDetail('')
    setError(null)
    setDone(false)
    setSubmitting(false)
  }

  async function submit() {
    setError(null)
    setSubmitting(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      setError('로그인이 필요해요.')
      return
    }
    const { error: insErr } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      detail: detail.trim() || null,
    })
    setSubmitting(false)
    if (insErr) {
      if (insErr.code === '23505') setError('이미 신고한 콘텐츠예요.')
      else setError('신고 접수에 실패했어요: ' + insErr.message)
      return
    }
    setDone(true)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent>
        {done ? (
          <>
            <DialogTitle className="text-base font-bold text-foreground">신고가 접수됐어요</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-fg">
              검토 후 조치할게요. 감사합니다.
            </DialogDescription>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => onOpenChange(false)}>확인</Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle className="text-base font-bold text-foreground">신고하기</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-fg">
              신고 사유를 선택해주세요.
            </DialogDescription>

            <div className="mt-3 space-y-1.5">
              {REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
                  <input
                    type="radio"
                    name="report-reason"
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
              rows={3}
              maxLength={500}
              placeholder="상세 내용 (선택)"
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
              <Button variant="danger" onClick={submit} disabled={submitting}>
                {submitting ? '접수 중…' : '신고'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
