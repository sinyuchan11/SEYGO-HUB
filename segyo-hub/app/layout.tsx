import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Segyo Hub',
  description: '세교중학교 친구 커뮤니티',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
