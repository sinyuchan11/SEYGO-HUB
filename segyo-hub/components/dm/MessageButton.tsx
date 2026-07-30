'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function MessageButton({ targetId }: { targetId: string }) {
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
    <button
      type="button"
      disabled={busy}
      onClick={open}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
    >
      메시지
    </button>
  )
}
