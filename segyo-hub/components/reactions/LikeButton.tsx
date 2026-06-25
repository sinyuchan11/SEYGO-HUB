'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HeartIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

export function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  small,
}: {
  targetType: 'post' | 'comment'
  targetId: number
  initialLiked: boolean
  initialCount: number
  small?: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return
    }
    if (liked) {
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
      if (!error) {
        setLiked(false)
        setCount((c) => c - 1)
      }
    } else {
      const { error } = await supabase.from('reactions').insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      })
      if (!error) {
        setLiked(true)
        setCount((c) => c + 1)
      }
    }
    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cn(
        'inline-flex items-center gap-1 transition-colors',
        small ? 'text-xs' : 'text-sm',
        liked ? 'text-danger' : 'text-muted-fg hover:text-danger',
      )}
    >
      <HeartIcon size={small ? 14 : 16} filled={liked} />
      {count}
    </button>
  )
}
