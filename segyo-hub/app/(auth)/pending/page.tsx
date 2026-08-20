import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClockIcon, ShieldBanIcon } from '@/components/ui/icons'

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
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      {/* 폼이 없는 화면이라 로그인의 스플릿 카드 대신 가운데 카드 하나로 잡는다. */}
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-surface p-8 text-center shadow-2xl md:p-10">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${
            banned ? 'bg-danger/10 text-danger' : 'bg-primary-50 text-primary-600'
          }`}
        >
          {banned ? <ShieldBanIcon size={30} /> : <ClockIcon size={30} />}
        </div>

        <h1 className="mt-5 text-2xl font-bold text-foreground">
          {banned ? '접근이 차단되었습니다' : '승인 대기 중'}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-fg">
          {banned ? (
            '운영자가 계정을 차단했습니다. 문의는 운영자에게 직접 연락해 주세요.'
          ) : (
            <>
              가입은 끝났어요. 이제 운영자 승인만 기다리면 됩니다.
              <br />
              승인되면 바로 글을 쓸 수 있어요.
            </>
          )}
        </p>

        {!banned && (
          <p className="mt-5 rounded-xl border border-border bg-muted px-4 py-3 text-xs leading-relaxed text-muted-fg">
            승인은 운영자가 직접 확인해서 처리해요. 조금 걸릴 수 있으니 잠시 후 다시
            들어와 주세요.
          </p>
        )}

        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="text-sm font-medium text-muted-fg transition-colors hover:text-foreground"
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  )
}
