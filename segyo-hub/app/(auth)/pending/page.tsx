import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const banned = profile?.role === 'banned'

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      {banned ? (
        <>
          <h1 className="mb-4 text-2xl font-bold">접근이 차단되었습니다</h1>
          <p className="text-gray-600">
            운영자가 계정을 차단했습니다. 문의는 운영자에게 직접 연락해 주세요.
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-bold">승인 대기 중</h1>
          <p className="text-gray-600">
            가입은 완료되었지만 아직 운영자의 승인이 필요해요. 승인되면
            바로 글을 쓸 수 있습니다.
          </p>
        </>
      )}
      <form action={logout} className="mt-8">
        <button type="submit" className="text-sm text-blue-600 underline">
          로그아웃
        </button>
      </form>
    </main>
  )
}
