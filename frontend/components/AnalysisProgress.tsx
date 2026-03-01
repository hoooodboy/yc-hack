'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAnalysisStatus } from '@/lib/api'

interface AnalysisProgressProps {
  username: string
  onComplete: (result: any) => void
  onError: (error: string) => void
}

const STEPS = [
  { progress: 10, text: '프로필 탐색 중...' },
  { progress: 35, text: '소셜 미디어 분석 중...' },
  { progress: 60, text: '관심사 추출 중...' },
  { progress: 80, text: '디지털 트윈 생성 중...' },
  { progress: 95, text: '매칭 상대 검색 중...' },
]

function ScannerEffect() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-soul-primary/15"
          animate={{
            scale: [1, 1.6 + i * 0.2],
            opacity: [0.4, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.6,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full soul-gradient-bg flex items-center justify-center"
        >
          <span className="text-2xl font-bold text-white" style={{ transform: 'rotate(-45deg)' }}>S</span>
        </motion.div>
      </div>
    </div>
  )
}

function CompletedCheck() {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.3, 1] }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-5 h-5 rounded-full bg-soul-primary text-white flex items-center justify-center text-xs"
    >
      &#10003;
    </motion.span>
  )
}

export default function AnalysisProgress({ username, onComplete, onError }: AnalysisProgressProps) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('분석 준비 중...')
  const [status, setStatus] = useState('analyzing')
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const stableOnComplete = useCallback(onComplete, [])
  const stableOnError = useCallback(onError, [])

  useEffect(() => {
    if (!username) return

    const poll = async () => {
      try {
        const data = await getAnalysisStatus(username)
        setProgress(data.progress)
        setCurrentStep(data.current_step)
        setStatus(data.status)

        if (data.status === 'completed') {
          setTimeout(() => stableOnComplete(data.result), 1500)
          return
        }

        if (data.status === 'failed') {
          stableOnError(data.current_step)
          return
        }
      } catch {
        setProgress(prev => Math.min(prev + 10, 95))
      }
    }

    const interval = setInterval(poll, 2000)
    poll()

    return () => clearInterval(interval)
  }, [username, stableOnComplete, stableOnError])

  useEffect(() => {
    if (status !== 'analyzing') return
    const simulate = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(simulate)
          return prev
        }
        return prev + 5
      })
    }, 1500)
    return () => clearInterval(simulate)
  }, [status])

  useEffect(() => {
    STEPS.forEach((step, idx) => {
      if (progress >= step.progress && !completedSteps.has(idx)) {
        setCompletedSteps(prev => new Set(prev).add(idx))
      }
    })
  }, [progress, completedSteps])

  const currentStepInfo = STEPS.findLast(s => progress >= s.progress - 5) || STEPS[0]

  return (
    <div className="relative space-y-6">
      <ScannerEffect />

      {/* Progress bar */}
      <div className="space-y-2 relative">
        <div className="flex justify-between text-sm">
          <span className="text-soul-muted">분석 진행률</span>
          <motion.span
            key={progress}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-soul-primary font-bold"
          >
            {progress}%
          </motion.span>
        </div>
        <div className="h-2 bg-soul-subtle rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full soul-gradient-bg"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Current step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepInfo.text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="glass-card rounded-2xl p-5 text-center space-y-2 relative"
        >
          <p className="text-soul-text font-medium">{currentStep || currentStepInfo.text}</p>
        </motion.div>
      </AnimatePresence>

      {/* Step checklist */}
      <div className="space-y-2 relative">
        {STEPS.map((step, index) => {
          const isCompleted = progress >= step.progress
          const isActive = !isCompleted && progress >= step.progress - 20

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 text-sm transition-all duration-200 ${
                isCompleted
                  ? 'text-soul-text'
                  : isActive
                  ? 'text-soul-text'
                  : 'text-soul-muted/30'
              }`}
            >
              {isCompleted ? (
                <CompletedCheck />
              ) : (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  isActive
                    ? 'bg-soul-primary text-white animate-pulse'
                    : 'border border-soul-border'
                }`}>
                  {index + 1}
                </span>
              )}
              {step.text}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
