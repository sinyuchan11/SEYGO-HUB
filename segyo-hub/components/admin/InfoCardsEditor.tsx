'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export type InfoCardRow = { key: string; title: string; body: string | null }

export function InfoCardsEditor({ initial }: { initial: InfoCardRow[] }) {
  const router = useRouter()
  const [bodies, setBodies] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((c) => [c.key, c.body ?? ''])),
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save(key: string) {
    setError(null)
    setSavedKey(null)
    setSaving(key)
    const supabase = createClient()
    const { error: updErr } = await supabase
      .from('info_cards')
      .update({ body: bodies[key]?.trim() || null })
      .eq('key', key)
    setSaving(null)
    if (updErr) {
      setError('저장 실패: ' + updErr.message)
      return
    }
    setSavedKey(key)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {initial.map((c) => (
        <div key={c.key} className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-bold text-foreground">{c.title}</h3>
          <textarea
            value={bodies[c.key] ?? ''}
            onChange={(e) => setBodies((b) => ({ ...b, [c.key]: e.target.value }))}
            rows={6}
            placeholder="내용을 입력하세요. (예: 식단 메뉴, 일정 등 — 줄바꿈 가능)"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-fg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button onClick={() => save(c.key)} disabled={saving === c.key}>
              {saving === c.key ? '저장 중…' : '저장'}
            </Button>
            {savedKey === c.key && <span className="text-xs font-medium text-success">저장됐어요 ✓</span>}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
