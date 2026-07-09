'use client'

import { useEffect, useState } from 'react'
import { SunIcon, MoonIcon } from '@/components/ui/icons'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    setMounted(true)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // ignore storage errors (private mode etc.)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15"
    >
      {/* Avoid an icon mismatch before mount; render moon as a neutral default */}
      {mounted && dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  )
}
