'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth/AuthShell'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

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
    <AuthShell
      title="환영해요!"
      subtitle="닉네임을 정해주세요. 학년반은 선택입니다."
      headline={
        <>
          거의 다 왔어요
          <br />
          이름만 정하면 끝!
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="nickname" className="block text-sm font-medium text-foreground">
            닉네임
          </label>
          <Input
            id="nickname"
            type="text"
            required
            maxLength={20}
            placeholder="친구들에게 보일 이름"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <p className="text-xs text-muted-fg">2~20자. 나중에 프로필에서 바꿀 수 있어요.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="grade-class" className="block text-sm font-medium text-foreground">
            학년반 <span className="font-normal text-muted-fg">(선택)</span>
          </label>
          <Input
            id="grade-class"
            type="text"
            maxLength={10}
            placeholder="예: 1-3"
            value={gradeClass}
            onChange={(e) => setGradeClass(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
          {loading ? '저장 중...' : '시작하기'}
        </Button>
      </form>
    </AuthShell>
  )
}
