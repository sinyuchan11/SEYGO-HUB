'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordField } from '@/components/auth/PasswordField'
import { cn } from '@/lib/cn'

export function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!agreed) {
      setError('이용약관에 동의해야 가입할 수 있어요.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      // profile은 트리거로 자동 생성됨. agreed_to_terms_at만 업데이트.
      await supabase
        .from('profiles')
        .update({ agreed_to_terms_at: new Date().toISOString() })
        .eq('id', data.user.id)
    }
    router.push('/pending')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="signup-email" className="block text-sm font-medium text-foreground">
          이메일
        </label>
        <Input
          id="signup-email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <PasswordField
        id="signup-password"
        label="비밀번호"
        value={password}
        onChange={setPassword}
        minLength={6}
        hint="6자 이상으로 정해주세요."
      />

      {/* 약관 동의 — 클릭 영역을 카드 전체로 넓혀 모바일에서 누르기 쉽게 한다. */}
      <label
        className={cn(
          'flex cursor-pointer select-none items-start gap-3 rounded-xl border p-3 transition-colors',
          agreed
            ? 'border-primary-300 bg-primary-50'
            : 'border-border bg-surface hover:bg-muted',
        )}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
        />
        <span className="text-xs leading-relaxed text-muted-fg">
          만 14세 이상이며, 운영자(관리자)가 모든 글과 익명 글의 작성자를 볼 수 있다는 점에
          동의합니다.
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
        {loading ? '가입 중...' : '가입하기'}
      </Button>
    </form>
  )
}
