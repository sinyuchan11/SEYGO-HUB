import Link from 'next/link'
import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Segyo Hub 가입</h1>
      <SignupForm />
      <p className="mt-4 text-center text-sm">
        이미 계정 있어요?{' '}
        <Link href="/login" className="text-blue-600">로그인</Link>
      </p>
    </main>
  )
}
