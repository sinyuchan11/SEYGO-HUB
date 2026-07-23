'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlusIcon, TrashIcon } from '@/components/ui/icons'

export type BannedWord = {
  id: number
  word: string
  created_at: string
}

export function BannedWordList({ initial }: { initial: BannedWord[] }) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)

  async function addWord(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const word = input.trim().toLowerCase()
    if (!word) return
    if (initial.some((w) => w.word === word)) {
      setError('이미 등록된 단어예요.')
      return
    }
    setAdding(true)
    const supabase = createClient()
    const { error: insertError } = await supabase.from('banned_words').insert({ word })
    setAdding(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setInput('')
    router.refresh()
  }

  async function removeWord(id: number) {
    setBusy(id)
    const supabase = createClient()
    await supabase.from('banned_words').delete().eq('id', id)
    setBusy(null)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addWord} className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="금지어 추가"
          maxLength={50}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-muted-fg focus:border-primary-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={adding || input.trim().length === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <PlusIcon size={16} />
          추가
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
      )}

      {initial.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center text-sm text-muted-fg">
          등록된 금지어가 없어요.
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {initial.map((w) => (
            <li
              key={w.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-3 pr-1.5 text-sm text-foreground"
            >
              <span>{w.word}</span>
              <button
                type="button"
                aria-label={`${w.word} 삭제`}
                disabled={busy === w.id}
                onClick={() => removeWord(w.id)}
                className="inline-flex rounded-full p-1 text-muted-fg hover:bg-muted hover:text-danger disabled:opacity-50"
              >
                <TrashIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-fg">총 {initial.length}개 등록됨</p>
    </div>
  )
}
