import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role, grade_class')
    .eq('id', user.id)
    .single()

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const showAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

  return (
    <div className="px-4 py-6">
      <h2 className="text-lg font-bold">내 정보</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between border-b pb-2">
          <dt className="text-gray-500">닉네임</dt>
          <dd>{profile?.nickname ?? '-'}</dd>
        </div>
        <div className="flex justify-between border-b pb-2">
          <dt className="text-gray-500">학년반</dt>
          <dd>{profile?.grade_class ?? '-'}</dd>
        </div>
        <div className="flex justify-between border-b pb-2">
          <dt className="text-gray-500">권한</dt>
          <dd>{profile?.role}</dd>
        </div>
        <div className="flex justify-between border-b pb-2">
          <dt className="text-gray-500">이메일</dt>
          <dd>{user.email}</dd>
        </div>
      </dl>
      {showAdmin && (
        <Link href="/admin/users" className="mt-6 block rounded bg-gray-100 px-3 py-2 text-center">
          관리자 페이지
        </Link>
      )}
      <form action={logout} className="mt-4">
        <button className="w-full rounded border py-2 text-red-600">로그아웃</button>
      </form>
    </div>
  )
}
