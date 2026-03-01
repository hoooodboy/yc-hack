'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { generateMessages, openDM, OpenDMResult } from '@/lib/api'
import MessageSelector from '@/components/MessageSelector'

function Confetti() {
  const colors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff']
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[i % colors.length],
    size: Math.random() * 6 + 3,
    delay: Math.random() * 0.8,
    duration: Math.random() * 2 + 2,
    rotation: Math.random() * 720,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
          }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: p.rotation }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  )
}

function DMContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetUsername = searchParams.get('username') || ''
  const interestsParam = searchParams.get('interests') || ''
  const commonInterests = interestsParam ? interestsParam.split(',') : []

  const [messages, setMessages] = useState<string[]>([])
  const [selectedMessage, setSelectedMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [dmResult, setDmResult] = useState<OpenDMResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (targetUsername) {
      generateMessages('me', targetUsername, commonInterests)
        .then(data => {
          setMessages(data.messages)
          setLoading(false)
        })
        .catch(() => {
          setMessages([
            `${commonInterests[0] || '공통 관심사'} 좋아하시는 것 같던데, 어떻게 시작하셨어요?`,
            `저도 ${commonInterests[0] || '이 분야'} 관심 있는데 추천해주실 만한 곳 있나요?`,
            '프로필 보다가 취향이 너무 비슷해서 용기 내서 연락드렸어요 :)'
          ])
          setLoading(false)
        })
    }
  }, [targetUsername])

  const handleSendDM = async (message: string) => {
    setSelectedMessage(message)
    setSending(true)
    setError('')
    try {
      const result = await openDM(targetUsername, message)
      if (result.success) {
        setDmResult(result)
      } else {
        setError(result.message)
      }
    } catch {
      // 에러가 나도 성공으로 처리 (Instagram 링크 제공)
      setDmResult({
        success: true,
        message_typed: false,
        message: '메시지가 준비됐어요!',
        instagram_url: `https://ig.me/m/${targetUsername}`,
      })
    } finally {
      setSending(false)
    }
  }

  if (dmResult) {
    const messageSent = dmResult.message_sent
    const igUrl = dmResult.instagram_url || `https://ig.me/m/${targetUsername}`

    return (
      <main className="min-h-screen bg-soul-bg flex flex-col items-center justify-center px-4 relative">
        <Confetti />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="max-w-sm w-full text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 rounded-full soul-gradient-bg flex items-center justify-center mx-auto"
          >
            <span className="text-white text-3xl">&#10003;</span>
          </motion.div>

          {messageSent ? (
            <>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold text-soul-text"
              >
                메시지가 전송됐어요!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-soul-muted text-sm"
              >
                @{targetUsername}에게 DM이 자동으로 전송됐어요.
              </motion.p>
              {selectedMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="glass-card rounded-2xl p-4 text-soul-text text-sm text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full soul-gradient-bg flex items-center justify-center">
                      <span className="text-white text-[10px]">AI</span>
                    </span>
                    <span className="text-xs text-soul-muted">전송된 메시지</span>
                  </div>
                  <p className="leading-relaxed">{selectedMessage}</p>
                </motion.div>
              )}
              <motion.a
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full soul-gradient-bg text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity text-center"
              >
                Instagram에서 대화 보기
              </motion.a>
            </>
          ) : (
            <>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold text-soul-text"
              >
                메시지가 준비됐어요!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-soul-muted text-sm"
              >
                메시지를 복사한 뒤<br />@{targetUsername}의 DM에 붙여넣기 하세요
              </motion.p>
              {selectedMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="glass-card rounded-2xl p-4 text-soul-text text-sm text-left space-y-2"
                >
                  <p className="leading-relaxed">{selectedMessage}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMessage)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="text-soul-primary text-xs font-medium hover:underline"
                  >
                    {copied ? '복사됨!' : '메시지 복사하기'}
                  </button>
                </motion.div>
              )}
              <motion.a
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (selectedMessage) {
                    navigator.clipboard.writeText(selectedMessage)
                    setCopied(true)
                  }
                }}
                className="block w-full soul-gradient-bg text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity text-center"
              >
                Instagram DM 열기 (메시지 자동 복사)
              </motion.a>
            </>
          )}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            onClick={() => router.push('/match')}
            className="w-full border border-soul-border text-soul-text font-semibold py-3 rounded-2xl hover:bg-soul-subtle transition-colors text-sm"
          >
            계속 스와이프하기
          </motion.button>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-soul-bg flex flex-col items-center px-4 py-8">
      <div className="max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-3xl font-bold tracking-tight text-soul-text">SoulMatch</div>
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <h2 className="text-lg font-bold text-soul-text">
              @{targetUsername}에게 메시지
            </h2>
            {commonInterests.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {commonInterests.slice(0, 3).map(interest => (
                  <span key={interest} className="bg-soul-primary/10 text-soul-primary text-xs px-3 py-1 rounded-full font-medium">
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <MessageSelector
          messages={messages}
          onSelect={handleSendDM}
          isLoading={loading}
          isSending={sending}
        />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 text-center"
          >
            {error}
          </motion.div>
        )}

        <button
          onClick={() => router.back()}
          className="w-full py-3 text-soul-muted text-sm hover:text-soul-text transition-colors"
        >
          돌아가기
        </button>
      </div>
    </main>
  )
}

export default function DMPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-soul-bg flex items-center justify-center">
        <div className="text-soul-muted">로딩 중...</div>
      </main>
    }>
      <DMContent />
    </Suspense>
  )
}
