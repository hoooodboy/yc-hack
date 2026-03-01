import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SoulMatch — AI 소셜 매칭',
  description: 'AI 에이전트가 소셜 미디어를 분석해 진짜 잘 맞는 사람을 연결해드립니다',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-soul-bg min-h-screen text-soul-text antialiased">
        {children}
      </body>
    </html>
  )
}
