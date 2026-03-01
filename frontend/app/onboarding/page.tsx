'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeProfile } from '@/lib/api'

type PlatformType = 'instagram' | 'linkedin' | 'email'

const PLATFORMS: { id: PlatformType; label: string; desc: string; icon: JSX.Element }[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    desc: 'Instagram 프로필을 분석합니다',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    desc: 'LinkedIn 프로필을 분석합니다',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    id: 'email',
    label: 'Email',
    desc: '이메일로 연결된 소셜 프로필을 찾습니다',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
]

const CONSENTS = [
  { id: 'consent1', label: '공개된 데이터만 수집합니다' },
  { id: 'consent2', label: '개인정보 처리에 동의합니다' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputFocused, setInputFocused] = useState(false)

  const allChecked = CONSENTS.every(c => checked[c.id])

  const getPlaceholder = () => {
    switch (selectedPlatform) {
      case 'instagram': return 'username'
      case 'linkedin': return 'https://linkedin.com/in/...'
      case 'email': return 'you@example.com'
      default: return ''
    }
  }

  const getInputPrefix = () => {
    if (selectedPlatform === 'instagram') return '@'
    return null
  }

  const getInputType = () => {
    if (selectedPlatform === 'email') return 'email'
    return 'text'
  }

  const handleStart = async () => {
    if (!inputValue.trim()) {
      setError('입력값을 확인해주세요')
      return
    }
    setLoading(true)
    setError('')
    try {
      const cleanValue = selectedPlatform === 'instagram'
        ? inputValue.replace('@', '').trim()
        : inputValue.trim()
      await analyzeProfile(selectedPlatform || 'instagram', cleanValue)
      router.push(`/analyze?username=${encodeURIComponent(cleanValue)}&type=${selectedPlatform}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '서버와 연결할 수 없습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  const handleDemoMode = () => {
    router.push('/match')
  }

  return (
    <main className="min-h-screen bg-soul-bg flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold tracking-tight text-soul-text">SoulMatch</div>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="h-1 w-10 rounded-full bg-soul-subtle overflow-hidden">
                <motion.div
                  className="h-full rounded-full soul-gradient-bg"
                  initial={{ width: 0 }}
                  animate={{ width: step >= s ? '100%' : '0%' }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            ))}
          </div>
          <p className="text-soul-muted text-sm">Step {step} / 3</p>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Platform Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-soul-text">플랫폼 선택</h2>
              <p className="text-soul-muted text-sm">분석할 소셜 미디어를 선택해주세요</p>
              <div className="space-y-3">
                {PLATFORMS.map(platform => {
                  const isSelected = selectedPlatform === platform.id
                  return (
                    <motion.button
                      key={platform.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all duration-200 ${
                        isSelected
                          ? 'bg-white border-2 border-soul-primary card-shadow-hover'
                          : 'glass-card hover:shadow-md'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                        isSelected
                          ? 'bg-soul-primary/10 text-soul-primary'
                          : 'bg-soul-subtle text-soul-muted'
                      }`}>
                        {platform.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${isSelected ? 'text-soul-primary' : 'text-soul-text'}`}>
                          {platform.label}
                        </div>
                        <div className="text-soul-muted text-xs mt-0.5">{platform.desc}</div>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-soul-primary flex items-center justify-center flex-shrink-0"
                        >
                          <span className="text-white text-xs">&#10003;</span>
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
              <motion.button
                onClick={() => selectedPlatform && setStep(2)}
                disabled={!selectedPlatform}
                whileTap={selectedPlatform ? { scale: 0.97 } : undefined}
                className={`w-full py-4 rounded-2xl font-semibold transition-all duration-200 ${
                  selectedPlatform
                    ? 'soul-gradient-bg text-white hover:opacity-90'
                    : 'bg-soul-subtle text-soul-muted cursor-not-allowed'
                }`}
              >
                다음
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Input */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-soul-text">
                {selectedPlatform === 'instagram' && 'Instagram 계정 입력'}
                {selectedPlatform === 'linkedin' && 'LinkedIn 프로필 URL'}
                {selectedPlatform === 'email' && '이메일 주소 입력'}
              </h2>
              <p className="text-soul-muted text-sm">
                AI가 공개 데이터를 분석해 관심사 프로필을 만들어드립니다.
              </p>
              <div className="space-y-3">
                <div className={`glass-card rounded-2xl p-4 flex items-center gap-2 transition-all duration-200 ${
                  inputFocused ? 'border-soul-primary shadow-sm' : ''
                }`}>
                  {getInputPrefix() && (
                    <span className="text-soul-primary font-bold text-lg">{getInputPrefix()}</span>
                  )}
                  <input
                    type={getInputType()}
                    placeholder={getPlaceholder()}
                    value={selectedPlatform === 'instagram' ? inputValue.replace(/^@/, '') : inputValue}
                    onChange={e => setInputValue(
                      selectedPlatform === 'instagram'
                        ? e.target.value.replace(/^@/, '')
                        : e.target.value
                    )}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={e => e.key === 'Enter' && setStep(3)}
                    className="w-full bg-transparent text-soul-text placeholder-soul-muted/50 outline-none text-lg"
                  />
                </div>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                    {error}
                  </motion.div>
                )}
              </div>
              <motion.button
                onClick={() => {
                  if (!inputValue.trim()) {
                    setError('입력값을 확인해주세요')
                    return
                  }
                  setError('')
                  setStep(3)
                }}
                disabled={!inputValue.trim()}
                whileTap={inputValue.trim() ? { scale: 0.97 } : undefined}
                className={`w-full py-4 rounded-2xl font-semibold transition-all duration-200 ${
                  inputValue.trim()
                    ? 'soul-gradient-bg text-white hover:opacity-90'
                    : 'bg-soul-subtle text-soul-muted cursor-not-allowed'
                }`}
              >
                다음
              </motion.button>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 text-soul-muted text-sm hover:text-soul-text transition-colors"
              >
                이전으로
              </button>
            </motion.div>
          )}

          {/* Step 3: Consent */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-soul-text">서비스 이용 동의</h2>
              <div className="space-y-3">
                {CONSENTS.map(consent => {
                  const isChecked = checked[consent.id] || false
                  return (
                    <motion.label
                      key={consent.id}
                      whileTap={{ scale: 0.98 }}
                      className={`rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                        isChecked
                          ? 'bg-white border-2 border-soul-primary/30'
                          : 'glass-card'
                      }`}
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => setChecked(prev => ({ ...prev, [consent.id]: e.target.checked }))}
                          className="sr-only"
                        />
                        <motion.div
                          animate={isChecked
                            ? { scale: [1, 1.15, 1], backgroundColor: '#6366f1' }
                            : { scale: 1, backgroundColor: 'transparent' }
                          }
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                            isChecked ? 'border-soul-primary' : 'border-soul-muted/40'
                          }`}
                        >
                          {isChecked && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-white text-xs"
                            >
                              &#10003;
                            </motion.span>
                          )}
                        </motion.div>
                      </div>
                      <span className="text-soul-text text-sm leading-relaxed">
                        {consent.label}
                      </span>
                    </motion.label>
                  )
                })}
              </div>
              <motion.button
                onClick={handleStart}
                disabled={!allChecked || loading}
                whileTap={allChecked && !loading ? { scale: 0.97 } : undefined}
                className={`w-full py-4 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  allChecked && !loading
                    ? 'soul-gradient-bg text-white hover:opacity-90'
                    : 'bg-soul-subtle text-soul-muted cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    시작 중...
                  </>
                ) : '분석 시작하기'}
              </motion.button>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-red-50 border border-red-100 p-4 text-center space-y-3"
                >
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    onClick={handleDemoMode}
                    className="text-soul-primary text-sm font-medium hover:underline"
                  >
                    데모 모드로 보기
                  </button>
                </motion.div>
              )}

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 text-soul-muted text-sm hover:text-soul-text transition-colors"
              >
                이전으로
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
