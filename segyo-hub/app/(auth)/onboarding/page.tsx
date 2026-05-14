'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [gradeClass, setGradeClass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상이어야 해요.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        grade_class: gradeClass.trim() || null,
      })
      .eq('id', user.id)
    if (error) {
      if (error.code === '23505') setError('이미 사용 중인 닉네임이에요.')
      else setError(error.message)
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">환영해요!</h1>
      <p className="mb-6 text-sm text-gray-600">
        닉네임을 정해주세요. 학년반은 선택입니다.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          required
          maxLength={20}
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="text"
          maxLength={10}
          placeholder="학년반 (예: 1-3) — 선택"
          value={gradeClass}
          onChange={(e) => setGradeClass(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {loading ? '저장 중...' : '시작하기'}
        </button>
      </form>
    </main>
  )
}
