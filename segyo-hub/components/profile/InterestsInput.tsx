'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { normalizeInterests, MAX_INTERESTS } from '@/lib/profile'

export function InterestsInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const full = value.length >= MAX_INTERESTS

  function add() {
    if (!draft.trim()) return
    onChange(normalizeInterests([...value, draft]))
    setDraft('')
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} tone="primary" className="gap-1">
              {tag}
              <button
                type="button"
                aria-label={`${tag} 제거`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="leading-none"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <input
        value={draft}
        disabled={full}
        placeholder={full ? '최대 5개' : '관심사 입력 후 Enter'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-fg disabled:opacity-50"
      />
    </div>
  )
}
