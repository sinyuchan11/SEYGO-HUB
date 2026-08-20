import Link from 'next/link'
import { SignupForm } from '@/components/auth/SignupForm'
import { AuthShell } from '@/components/auth/AuthShell'

export default function SignupPage() {
  return (
    <AuthShell
      title="가입하기"
      subtitle="세교중 친구들과 함께해요"
      headline={
        <>
          Segyo Hub
          <br />
          함께 시작해요
        </>
      }
      footer={
        <>
          이미 계정 있어요?{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  )
}
