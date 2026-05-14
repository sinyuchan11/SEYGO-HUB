'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Row = {
  id: string
  nickname: string | null
  email: string | null
  role: 'pending' | 'member' | 'moderator' | 'admin' | 'banned'
  grade_class: string | null
  created_at: string
}

export function UserTable({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function changeRole(id: string, role: Row['role']) {
    if (id === currentUserId && role !== 'admin') {
      if (!confirm('본인 권한을 낮추시겠어요? 이후엔 관리자 페이지에 못 들어와요.')) return
    }
    setError(null)
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? '실패')
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="overflow-x-auto">
      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">닉네임/이메일</th>
            <th className="px-3 py-2 text-left">반</th>
            <th className="px-3 py-2 text-left">권한</th>
            <th className="px-3 py-2 text-left">가입</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="px-3 py-2">
                <div className="font-medium">{r.nickname ?? '(미설정)'}</div>
                <div className="text-xs text-gray-500">{r.email ?? '-'}</div>
              </td>
              <td className="px-3 py-2">{r.grade_class ?? '-'}</td>
              <td className="px-3 py-2">
                <select
                  value={r.role}
                  disabled={pending}
                  onChange={(e) => changeRole(r.id, e.target.value as Row['role'])}
                  className="rounded border px-2 py-1"
                >
                  <option value="pending">대기자</option>
                  <option value="member">멤버</option>
                  <option value="moderator">모더</option>
                  <option value="admin">관리자</option>
                  <option value="banned">차단</option>
                </select>
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">
                {new Date(r.created_at).toLocaleDateString('ko-KR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
