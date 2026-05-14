import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">로그인</h1>
      <LoginForm />
      <p className="mt-4 text-center text-sm">
        아직 계정 없어요?{' '}
        <Link href="/signup" className="text-blue-600">가입하기</Link>
      </p>
    </main>
  )
}
