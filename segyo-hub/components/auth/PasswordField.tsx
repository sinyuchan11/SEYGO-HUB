'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons'

/** 보기/숨기기 토글이 붙은 비밀번호 칸. 로그인·가입이 같이 쓴다. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  minLength,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minLength?: number
  hint?: string
}) {
  const [shown, setShown] = useState(false)

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? 'text' : 'password'}
          required
          minLength={minLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={shown ? '비밀번호 숨기기' : '비밀번호 표시'}
          onClick={() => setShown((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-fg transition-colors hover:text-foreground"
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-fg">{hint}</p>}
    </div>
  )
}
