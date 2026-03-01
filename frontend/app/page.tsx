'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const HERO_TEXT = '진짜 잘 맞는 사람을'

function TypingHero() {
  const [visibleChars, setVisibleChars] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleChars(prev => {
        if (prev >= HERO_TEXT.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 80)
    return () => clearInterval(timer)
  }, [])

  return (
    <h1 className="text-3xl font-bold text-soul-text leading-tight tracking-tight">
      {HERO_TEXT.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={i < visibleChars ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {char}
        </motion.span>
      ))}
      <br />
      <motion.span
        initial={{ opacity: 0 }}
        animate={visibleChars >= HERO_TEXT.length ? { opacity: 1 } : {}}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="soul-gradient-text"
      >
        찾아드립니다
      </motion.span>
    </h1>
  )
}

function SocialProofCounter() {
  const [count, setCount] = useState(1183)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3))
    }, 4000 + Math.random() * 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.8 }}
      className="text-soul-muted text-xs"
    >
      이미 <span className="text-soul-primary font-semibold">{count.toLocaleString()}명</span>이 첫 메시지를 보냈어요
    </motion.p>
  )
}

const featureItems = [
  {
    title: 'AI 프로필 분석',
    desc: '소셜 미디어 공개 데이터를 AI가 정밀 분석합니다',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: '디지털 트윈 매칭',
    desc: '관심사와 라이프스타일을 기반으로 최적의 매칭을 제안합니다',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: '맞춤 첫 메시지',
    desc: '내 말투 그대로 자연스러운 첫 메시지를 AI가 생성합니다',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-soul-bg flex flex-col items-center justify-center px-4 py-16 relative">
      {/* Subtle gradient accent at top */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full text-center space-y-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="space-y-1"
        >
          <div className="text-5xl font-bold tracking-tight text-soul-text">SoulMatch</div>
          <div className="text-soul-muted text-xs tracking-[0.3em] uppercase">AI Social Matching</div>
        </motion.div>

        {/* Typing hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-4"
        >
          <TypingHero />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="text-soul-muted text-sm leading-relaxed"
          >
            AI가 당신의 디지털 트윈을 만들어<br />진짜 잘 맞는 사람을 찾아드립니다
          </motion.p>
        </motion.div>

        {/* Feature cards */}
        <div className="space-y-3">
          {featureItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.15, duration: 0.5, ease: 'easeOut' }}
              className="glass-card rounded-2xl p-4 flex items-start gap-4 text-left hover:shadow-md transition-shadow duration-200"
            >
              <div className="w-9 h-9 rounded-xl bg-soul-primary/10 text-soul-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div>
                <div className="text-soul-text font-semibold text-sm">{item.title}</div>
                <div className="text-soul-muted text-xs mt-1">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
          className="space-y-3"
        >
          <Link
            href="/onboarding"
            className="cta-shimmer block w-full soul-gradient-bg text-white font-semibold py-4 px-8 rounded-2xl text-center hover:opacity-90 transition-opacity active:scale-[0.98] transform"
          >
            시작하기
          </Link>
          <Link
            href="/match"
            className="block w-full border border-soul-border text-soul-text font-semibold py-3 px-8 rounded-2xl text-center hover:bg-soul-subtle transition-colors text-sm"
          >
            데모 보기
          </Link>
          <SocialProofCounter />
          <p className="text-soul-muted text-xs opacity-60">
            공개 데이터만 수집 · 자동 전송 없음 · 언제든 탈퇴 가능
          </p>
        </motion.div>
      </div>
    </main>
  )
}
