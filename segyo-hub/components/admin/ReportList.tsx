'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { timeAgo } from '@/lib/time'

export type ReportRow = {
  id: number
  reporterNickname: string | null
  targetType: 'post' | 'comment'
  targetId: number
  reason: string
  detail: string | null
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
}

const STATUS: Record<ReportRow['status'], { label: string; tone: 'primary' | 'success' | 'neutral' }> = {
  open: { label: '처리 대기', tone: 'primary' },
  resolved: { label: '처리완료', tone: 'success' },
  dismissed: { label: '기각', tone: 'neutral' },
}

export function ReportList({ initial }: { initial: ReportRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<number | null>(null)

  async function setStatus(id: number, status: ReportRow['status']) {
    setBusy(id)
    const supabase = createClient()
    await supabase.from('reports').update({ status }).eq('id', id)
    setBusy(null)
    router.refresh()
  }

  if (initial.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center text-sm text-muted-fg">
        접수된 신고가 없어요.
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {initial.map((r) => (
        <li key={r.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <Badge tone="danger">{r.reason}</Badge>
            <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
            <span className="ml-auto text-xs text-muted-fg" suppressHydrationWarning>
              {timeAgo(r.createdAt)}
            </span>
          </div>
          {r.detail && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{r.detail}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
            <span>신고자: {r.reporterNickname ?? '(알 수 없음)'}</span>
            {r.targetType === 'post' ? (
              <Link href={`/post/${r.targetId}`} className="font-medium text-primary-600 hover:underline">
                신고된 글 보기 →
              </Link>
            ) : (
              <span>댓글 #{r.targetId}</span>
            )}
          </div>
          {r.status === 'open' && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => setStatus(r.id, 'resolved')}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                처리완료
              </button>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => setStatus(r.id, 'dismissed')}
                className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border disabled:opacity-50"
              >
                기각
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
