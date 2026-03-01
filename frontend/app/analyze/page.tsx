'use client'

import { useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import AnalysisProgress from '@/components/AnalysisProgress'

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const username = searchParams.get('username') || ''
  const platformType = searchParams.get('type') || 'instagram'
  const [showComplete, setShowComplete] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleComplete = useCallback((result: any) => {
    setShowComplete(true)
    setTimeout(() => router.push(`/profile?username=${encodeURIComponent(username)}`), 1500)
  }, [router, username])

  const handleError = useCallback((error: string) => {
    setErrorMsg(error)
    setShowError(true)
  }, [])

  const handleDemoMode = () => {
    router.push('/match')
  }

  if (showComplete) {
    return (
      <main className="min-h-screen bg-soul-bg flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 rounded-full soul-gradient-bg text-white text-3xl flex items-center justify-center mx-auto"
          >
            &#10003;
          </motion.div>
          <h2 className="text-2xl font-bold text-soul-text">분석 완료!</h2>
          <p className="text-soul-muted text-sm">매칭 카드를 확인해보세요</p>
          <div className="w-10 h-10 border-2 border-soul-primary border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </motion.div>
      </main>
    )
  }

  if (showError) {
    return (
      <main className="min-h-screen bg-soul-bg flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-soul-text">분석에 문제가 생겼어요</h2>
          <p className="text-soul-muted text-sm">{errorMsg || '서버와 연결할 수 없습니다'}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowError(false)
                window.location.reload()
              }}
              className="w-full soul-gradient-bg text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity"
            >
              다시 시도하기
            </button>
            <button
              onClick={handleDemoMode}
              className="w-full border border-soul-border text-soul-text font-semibold py-4 rounded-2xl hover:bg-soul-subtle transition-colors"
            >
              데모 모드로 보기
            </button>
            <p className="text-soul-muted text-xs">데모 모드는 샘플 매칭 데이터를 사용합니다</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-soul-bg flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold tracking-tight text-soul-text mb-2">SoulMatch</div>
          <h2 className="text-xl font-bold soul-gradient-text inline-block">디지털 트윈 생성 중...</h2>
          <p className="text-soul-muted text-sm mt-2">
            {platformType === 'instagram' ? `@${username}` : username}
          </p>
        </div>
        <AnalysisProgress
          username={username}
          onComplete={handleComplete}
          onError={handleError}
        />
      </div>
    </main>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-soul-bg flex items-center justify-center">
        <div className="text-soul-muted">로딩 중...</div>
      </main>
    }>
      <AnalyzeContent />
    </Suspense>
  )
}
