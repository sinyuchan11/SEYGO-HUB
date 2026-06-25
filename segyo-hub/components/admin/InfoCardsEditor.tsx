'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export type InfoCardRow = {
  key: string
  title: string
  body: string | null
  image_url: string | null
}

export function InfoCardsEditor({ initial }: { initial: InfoCardRow[] }) {
  const router = useRouter()
  const [bodies, setBodies] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((c) => [c.key, c.body ?? ''])),
  )
  const [images, setImages] = useState<Record<string, string | null>>(
    Object.fromEntries(initial.map((c) => [c.key, c.image_url ?? null])),
  )
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  async function uploadImage(key: string, file: File) {
    setError(null)
    setSavedKey(null)
    setUploadingKey(key)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/admin/info-image', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? '이미지 업로드에 실패했어요.')
        return
      }
      const { url } = await res.json()
      setImages((m) => ({ ...m, [key]: url }))
    } catch {
      setError('이미지 업로드 중 오류가 발생했어요.')
    } finally {
      setUploadingKey(null)
    }
  }

  async function save(key: string) {
    setError(null)
    setSavedKey(null)
    setSaving(key)
    const supabase = createClient()
    const { error: updErr } = await supabase
      .from('info_cards')
      .update({ body: bodies[key]?.trim() || null, image_url: images[key] ?? null })
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

          {/* Image */}
          {images[c.key] && (
            <div className="relative mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[c.key] as string}
                alt={c.title}
                className="max-h-72 w-full rounded-lg border border-border bg-canvas object-contain"
              />
              <button
                type="button"
                onClick={() => setImages((m) => ({ ...m, [c.key]: null }))}
                className="absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/70"
              >
                이미지 제거
              </button>
            </div>
          )}

          <div className="mb-2">
            <button
              type="button"
              onClick={() => inputs.current[c.key]?.click()}
              disabled={uploadingKey === c.key}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              {uploadingKey === c.key ? '업로드 중…' : images[c.key] ? '이미지 변경' : '이미지 추가'}
            </button>
            <input
              ref={(el) => {
                inputs.current[c.key] = el
              }}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadImage(c.key, f)
                e.target.value = ''
              }}
            />
          </div>

          <textarea
            value={bodies[c.key] ?? ''}
            onChange={(e) => setBodies((b) => ({ ...b, [c.key]: e.target.value }))}
            rows={5}
            placeholder="설명 텍스트 (선택) — 줄바꿈 가능"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-fg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />

          <div className="mt-2 flex items-center gap-3">
            <Button onClick={() => save(c.key)} disabled={saving === c.key || uploadingKey === c.key}>
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
