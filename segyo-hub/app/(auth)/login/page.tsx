import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthShell } from '@/components/auth/AuthShell'

export default function LoginPage() {
  return (
    <AuthShell
      title="로그인"
      subtitle="다시 오신 걸 환영해요"
      headline={
        <>
          Segyo Hub
          <br />
          오신걸 환영 합니다
        </>
      }
      footer={
        <>
          아직 계정 없어요?{' '}
          <Link href="/signup" className="font-medium text-primary-600 hover:underline">
            가입하기
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
