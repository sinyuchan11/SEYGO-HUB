'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_CLASS =
  'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50'

export function MessageButton({
  targetId,
  className,
  label = '메시지',
}: {
  targetId: string
  /** 목록 안에서 다른 버튼들과 크기를 맞춰야 할 때 넘긴다. */
  className?: string
  label?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function open() {
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_or_create_conversation', { other: targetId })
    setBusy(false)
    if (error || data == null) return
    router.push(`/messages/${data}`)
  }

  return (
    <button type="button" disabled={busy} onClick={open} className={className ?? DEFAULT_CLASS}>
      {label}
    </button>
  )
}
