'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

  const cls = small ? 'text-xs' : 'text-sm'
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`${cls} ${liked ? 'text-red-600' : 'text-gray-600'}`}
    >
      {liked ? '❤️' : '🤍'} {count}
    </button>
  )
}
