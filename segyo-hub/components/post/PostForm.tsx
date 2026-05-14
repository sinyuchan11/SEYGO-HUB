'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function PostForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (title.trim().length === 0 || content.trim().length === 0) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        board: 'free',
        title: title.trim(),
        content: content.trim(),
      })
      .select('id')
      .single()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push(`/post/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 px-4 py-4">
      <input
        type="text"
        required
        maxLength={100}
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      <textarea
        required
        rows={10}
        maxLength={5000}
        placeholder="내용을 입력하세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {loading ? '등록 중...' : '등록'}
      </button>
    </form>
  )
}
