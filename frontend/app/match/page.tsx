'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { getMatches, getAnalysisStatus, MatchCard, MatchFilters, AnalysisStatus } from '@/lib/api'
import SwipeCard from '@/components/SwipeCard'
import ProfileCard from '@/components/ProfileCard'
import SkeletonCard from '@/components/SkeletonCard'

/* ── Filter constants ─────────────────────────────── */
const GENDER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
] as const

const FOLLOWER_PRESETS = [
  { value: 'all', label: '전체', min: undefined, max: undefined },
  { value: '1k-10k', label: '1K - 10K', min: 1000, max: 10000 },
  { value: '10k-100k', label: '10K - 100K', min: 10000, max: 100000 },
  { value: '100k+', label: '100K+', min: 100000, max: undefined },
] as const

const CONTENT_TYPES = [
  { value: 'food', label: '음식' },
  { value: 'travel', label: '여행' },
  { value: 'art', label: '아트' },
  { value: 'fitness', label: '운동' },
  { value: 'fashion', label: '패션' },
  { value: 'beauty', label: '뷰티' },
  { value: 'music', label: '음악' },
  { value: 'lifestyle', label: '라이프스타일' },
] as const

const LOCATION_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'seoul', label: '서울' },
  { value: 'busan', label: '부산' },
  { value: 'jeju', label: '제주' },
] as const

const AGE_RANGE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '20대 초반', label: '20대 초반' },
  { value: '20대 중후반', label: '20대 중후반' },
  { value: '30대 초반', label: '30대 초반' },
  { value: '30대 중후반', label: '30대 중후반' },
] as const

interface FilterState {
  gender: string
  followerPreset: string
  contentTypes: string[]
  location: string
  ageRange: string
}

const DEFAULT_FILTERS: FilterState = {
  gender: 'all',
  followerPreset: 'all',
  contentTypes: [],
  location: 'seoul',
  ageRange: 'all',
}

/* ── Big5 label map ───────────────────────────────── */
const BIG5_LABELS: Record<string, string> = {
  openness: '개방성',
  conscientiousness: '성실성',
  extraversion: '외향성',
  agreeableness: '친화성',
  neuroticism: '신경성',
}

const BIG5_COLORS: Record<string, string> = {
  openness: 'from-violet-500 to-purple-500',
  conscientiousness: 'from-blue-500 to-cyan-500',
  extraversion: 'from-amber-500 to-orange-500',
  agreeableness: 'from-emerald-500 to-teal-500',
  neuroticism: 'from-rose-500 to-pink-500',
}

/* ── Interest tag colors ──────────────────────────── */
const TAG_COLORS = [
  'bg-indigo-50 text-indigo-600 border-indigo-100',
  'bg-violet-50 text-violet-600 border-violet-100',
  'bg-blue-50 text-blue-600 border-blue-100',
  'bg-sky-50 text-sky-600 border-sky-100',
  'bg-purple-50 text-purple-600 border-purple-100',
  'bg-pink-50 text-pink-600 border-pink-100',
  'bg-emerald-50 text-emerald-600 border-emerald-100',
  'bg-amber-50 text-amber-600 border-amber-100',
]

function getTagColor(interest: string): string {
  let hash = 0
  for (let i = 0; i < interest.length; i++) {
    hash = interest.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

/* ── DigitalTwinSection ───────────────────────────── */
function DigitalTwinSection({
  username,
  analysis,
  loading,
}: {
  username: string
  analysis: AnalysisStatus | null
  loading: boolean
}) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl card-shadow border border-soul-border p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 skeleton rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 skeleton rounded-lg" />
            <div className="h-3 w-32 skeleton rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-16 skeleton rounded-full" />
          <div className="h-7 w-20 skeleton rounded-full" />
          <div className="h-7 w-14 skeleton rounded-full" />
          <div className="h-7 w-18 skeleton rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-12 skeleton rounded" />
              <div className="flex-1 h-3 skeleton rounded-full" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full skeleton rounded" />
          <div className="h-3 w-3/4 skeleton rounded" />
        </div>
      </motion.div>
    )
  }

  const result = analysis?.result

  // No analysis result -- prompt the user
  if (!result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl card-shadow border border-soul-border p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full soul-gradient-bg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-soul-text">@{username}</h2>
            <p className="text-xs text-soul-muted">디지털 트윈 분석</p>
          </div>
        </div>
        <div className="bg-soul-subtle rounded-xl p-4 border border-soul-border text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <p className="text-soul-text text-sm font-medium">프로필 분석을 먼저 진행해주세요</p>
          <p className="text-soul-muted text-xs">분석이 완료되면 더 정확한 매칭을 받을 수 있어요</p>
          <Link
            href="/analyze"
            className="inline-block soul-gradient-bg text-white font-semibold py-2.5 px-6 rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            프로필 분석하기
          </Link>
        </div>
      </motion.div>
    )
  }

  // Full analysis display
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl card-shadow border border-soul-border overflow-hidden"
    >
      {/* Header */}
      <div className="soul-gradient-bg p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">@{username}</h2>
            <p className="text-white/70 text-xs">디지털 트윈 분석 결과</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Interests */}
        {result.interests && result.interests.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <p className="text-sm font-semibold text-soul-text">관심사</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.interests.map((interest) => (
                <span
                  key={interest}
                  className={`${getTagColor(interest)} text-xs px-3 py-1.5 rounded-full font-medium border`}
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Big5 personality */}
        {result.personality_big5 && Object.keys(result.personality_big5).length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M12 6v6l4 2" />
              </svg>
              <p className="text-sm font-semibold text-soul-text">Big5 성격 분석</p>
            </div>
            <div className="space-y-3">
              {Object.entries(result.personality_big5).map(([trait, score]) => {
                const label = BIG5_LABELS[trait] || trait
                const colorClass = BIG5_COLORS[trait] || 'from-gray-400 to-gray-500'
                const percentage = Math.round(score * 100)
                return (
                  <div key={trait} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-soul-text">{label}</span>
                      <span className="text-xs text-soul-muted">{percentage}%</span>
                    </div>
                    <div className="h-2 bg-soul-subtle rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Communication style */}
        {result.communication_style && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-sm font-semibold text-soul-text">커뮤니케이션 스타일</p>
            </div>
            <div className="bg-soul-subtle rounded-xl p-3 border border-soul-border">
              <p className="text-soul-text text-sm leading-relaxed">{result.communication_style}</p>
            </div>
          </div>
        )}

        {/* AI summary */}
        {result.summary && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <p className="text-sm font-semibold text-soul-text">AI 요약</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-soul-text text-sm leading-relaxed">{result.summary}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── InlineFilters ─────────────────────────────────── */
function InlineFilters({
  filters,
  onChange,
}: {
  filters: FilterState
  onChange: (f: FilterState) => void
}) {
  const toggleContentType = (val: string) => {
    onChange({
      ...filters,
      contentTypes: filters.contentTypes.includes(val)
        ? filters.contentTypes.filter(v => v !== val)
        : [...filters.contentTypes, val],
    })
  }

  const handleReset = () => onChange(DEFAULT_FILTERS)

  const activeCount =
    (filters.gender !== 'all' ? 1 : 0) +
    (filters.followerPreset !== 'all' ? 1 : 0) +
    filters.contentTypes.length +
    (filters.location !== 'all' && filters.location !== 'seoul' ? 1 : 0) +
    (filters.ageRange !== 'all' ? 1 : 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-2xl card-shadow border border-soul-border p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
            <circle cx="6" cy="12" r="2" fill="#6366f1" />
            <circle cx="10" cy="18" r="2" fill="#6366f1" />
          </svg>
          <h3 className="text-base font-bold text-soul-text">매칭 필터</h3>
          {activeCount > 0 && (
            <span className="soul-gradient-bg text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <button
          onClick={handleReset}
          className="text-soul-primary text-sm font-medium hover:opacity-70 transition-opacity"
        >
          초기화
        </button>
      </div>

      {/* Gender */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-soul-text">성별</p>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, gender: opt.value })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                filters.gender === opt.value
                  ? 'soul-gradient-bg text-white shadow-sm'
                  : 'bg-soul-subtle text-soul-muted border border-soul-border hover:border-soul-primary/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Followers */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-soul-text">팔로워</p>
        <div className="grid grid-cols-2 gap-2">
          {FOLLOWER_PRESETS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, followerPreset: opt.value })}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                filters.followerPreset === opt.value
                  ? 'soul-gradient-bg text-white shadow-sm'
                  : 'bg-soul-subtle text-soul-muted border border-soul-border hover:border-soul-primary/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content type */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-soul-text">콘텐츠 타입</p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleContentType(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filters.contentTypes.includes(opt.value)
                  ? 'soul-gradient-bg text-white shadow-sm'
                  : 'bg-soul-subtle text-soul-muted border border-soul-border hover:border-soul-primary/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-soul-text">지역</p>
        <div className="flex gap-2 flex-wrap">
          {LOCATION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, location: opt.value })}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                filters.location === opt.value
                  ? 'soul-gradient-bg text-white shadow-sm'
                  : 'bg-soul-subtle text-soul-muted border border-soul-border hover:border-soul-primary/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Age range */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-soul-text">연령대</p>
        <div className="flex gap-2 flex-wrap">
          {AGE_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, ageRange: opt.value })}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                filters.ageRange === opt.value
                  ? 'soul-gradient-bg text-white shadow-sm'
                  : 'bg-soul-subtle text-soul-muted border border-soul-border hover:border-soul-primary/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ── View type ────────────────────────────────────── */
type ViewState = 'setup' | 'loading' | 'results'

/* ── MatchContent ─────────────────────────────────── */
function MatchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const username = searchParams.get('username') || ''

  // Analysis state
  const [analysis, setAnalysis] = useState<AnalysisStatus | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  // View state
  const [view, setView] = useState<ViewState>('setup')

  // Match results
  const [cards, setCards] = useState<MatchCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Restore saved match state from sessionStorage (DM에서 돌아올 때)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('soulmatch_cards')
      const savedIndex = sessionStorage.getItem('soulmatch_index')
      if (saved) {
        const parsed = JSON.parse(saved) as MatchCard[]
        if (parsed.length > 0) {
          const idx = savedIndex ? parseInt(savedIndex, 10) : 0
          setCards(parsed)
          setCurrentIndex(idx)
          setView('results')
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Save match state to sessionStorage whenever it changes
  useEffect(() => {
    if (cards.length > 0) {
      sessionStorage.setItem('soulmatch_cards', JSON.stringify(cards))
      sessionStorage.setItem('soulmatch_index', String(currentIndex))
    }
  }, [cards, currentIndex])

  // Fetch analysis status on mount
  useEffect(() => {
    if (!username) {
      setAnalysisLoading(false)
      return
    }
    setAnalysisLoading(true)
    getAnalysisStatus(username)
      .then(data => {
        setAnalysis(data)
        setAnalysisLoading(false)
      })
      .catch(() => {
        setAnalysis(null)
        setAnalysisLoading(false)
      })
  }, [username])

  // Start match search
  const handleStartMatch = () => {
    setView('loading')
    const followerPreset = FOLLOWER_PRESETS.find(p => p.value === filters.followerPreset)
    const apiFilters: MatchFilters = {
      gender: filters.gender,
      min_followers: followerPreset?.min,
      max_followers: followerPreset?.max,
      content_type: filters.contentTypes.length > 0 ? filters.contentTypes.join(',') : undefined,
      location: filters.location,
      age_range: filters.ageRange,
    }
    getMatches(username || undefined, apiFilters)
      .then(data => {
        setCards(data)
        setCurrentIndex(0)
        setView('results')
      })
      .catch(() => {
        setCards([])
        setView('results')
      })
  }

  // Go back to setup
  const handleBackToSetup = () => {
    setView('setup')
    setCards([])
    setCurrentIndex(0)
    sessionStorage.removeItem('soulmatch_cards')
    sessionStorage.removeItem('soulmatch_index')
  }

  const currentCard = cards[currentIndex]
  const nextCard = cards[currentIndex + 1]
  const remaining = cards.length - currentIndex

  const handleSwipeLeft = () => {
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
    }, 300)
  }

  const handleSwipeRight = () => {
    if (currentCard) {
      // 다음 카드 인덱스를 미리 저장 (DM에서 돌아올 때 다음 카드부터 보이도록)
      const nextIdx = currentIndex + 1
      sessionStorage.setItem('soulmatch_index', String(nextIdx))
      router.push(`/dm?username=${encodeURIComponent(currentCard.username)}&interests=${encodeURIComponent(currentCard.common_interests.join(','))}`)
    }
  }

  /* ── Loading view ─────────────────────────────────── */
  if (view === 'loading') {
    return (
      <main className="min-h-screen bg-soul-bg flex flex-col items-center px-4 py-8">
        <div className="max-w-sm w-full space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold tracking-tight text-soul-text">SoulMatch</div>
            <div className="h-7 w-20 skeleton rounded-full" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-soul-primary text-sm font-medium animate-pulse">AI가 실제 Instagram 계정을 찾고 있어요...</p>
            <p className="text-soul-muted text-xs">관심사 기반 검색 + 프로필 분석 중 (15~30초)</p>
          </div>
          <div className="relative h-[520px]">
            <div className="absolute inset-0 scale-[0.92] opacity-40 pointer-events-none blur-[2px]">
              <SkeletonCard />
            </div>
            <div className="absolute inset-0">
              <SkeletonCard />
            </div>
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="w-16 h-16 skeleton rounded-full" />
            <div className="w-20 h-20 skeleton rounded-full" />
          </div>
        </div>
      </main>
    )
  }

  /* ── Results view (swipe cards) ───────────────────── */
  if (view === 'results') {
    return (
      <main className="min-h-screen bg-soul-bg flex flex-col items-center px-4 py-8">
        <div className="max-w-sm w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToSetup}
                className="flex items-center gap-1.5 text-soul-primary text-sm font-medium hover:opacity-70 transition-opacity"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                다시 설정
              </motion.button>
            </div>
            <motion.div
              key={remaining}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="soul-gradient-bg text-white rounded-full px-4 py-1 text-sm font-medium"
            >
              {remaining > 0 ? `${remaining}장 남음` : '완료'}
            </motion.div>
          </div>

          {/* Card area */}
          <div className="relative h-[520px]">
            <AnimatePresence mode="wait">
              {!currentCard ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full bg-white rounded-3xl card-shadow flex flex-col items-center justify-center space-y-4 text-center p-8"
                >
                  <div className="w-16 h-16 rounded-full soul-gradient-bg flex items-center justify-center">
                    <span className="text-white text-2xl">&#10003;</span>
                  </div>
                  <h3 className="text-xl font-bold text-soul-text">오늘의 추천이 모두 끝났어요</h3>
                  <p className="text-soul-muted text-sm">내일 새로운 추천을 확인해보세요</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentIndex(0)}
                      className="bg-soul-subtle text-soul-text font-semibold py-3 px-6 rounded-2xl border border-soul-border hover:bg-soul-card-hover transition-colors"
                    >
                      다시 보기
                    </button>
                    <button
                      onClick={handleBackToSetup}
                      className="soul-gradient-bg text-white font-semibold py-3 px-6 rounded-2xl hover:opacity-90 transition-opacity"
                    >
                      필터 변경
                    </button>
                  </div>
                </motion.div>
              ) : (
                <>
                  {nextCard && (
                    <div className="absolute inset-0 scale-[0.92] opacity-50 pointer-events-none blur-[2px] transition-all duration-300">
                      <ProfileCard
                        username={nextCard.username}
                        profileImageUrls={nextCard.profile_image_urls}
                        commonInterests={nextCard.common_interests}
                        aiSummary={nextCard.ai_summary}
                        compatibilityScore={nextCard.compatibility_score}
                        isPrivate={nextCard.is_private}
                        recentPosts={nextCard.recent_posts}
                      />
                    </div>
                  )}
                  <SwipeCard onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}>
                    <ProfileCard
                      username={currentCard.username}
                      profileImageUrls={currentCard.profile_image_urls}
                      commonInterests={currentCard.common_interests}
                      aiSummary={currentCard.ai_summary}
                      compatibilityScore={currentCard.compatibility_score}
                      isPrivate={currentCard.is_private}
                      recentPosts={currentCard.recent_posts}
                    />
                  </SwipeCard>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          {currentCard && (
            <div className="flex items-center justify-center gap-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleSwipeLeft}
                className="w-16 h-16 rounded-full bg-white border border-soul-border text-soul-muted text-2xl flex items-center justify-center hover:border-red-200 hover:text-red-400 transition-colors card-shadow"
              >
                &#10005;
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleSwipeRight}
                className="w-20 h-20 rounded-full soul-gradient-bg text-white text-3xl flex items-center justify-center shadow-lg shadow-indigo-200 hover:opacity-90 transition-opacity"
              >
                &#9829;
              </motion.button>
            </div>
          )}
        </div>
      </main>
    )
  }

  /* ── Setup view (digital twin + filters + CTA) ──── */
  return (
    <main className="min-h-screen bg-soul-bg flex flex-col items-center px-4 py-8">
      <div className="max-w-sm w-full space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="text-2xl font-bold tracking-tight text-soul-text">SoulMatch</div>
          {username && (
            <span className="text-soul-muted text-sm">@{username}</span>
          )}
        </motion.div>

        {/* Digital Twin Analysis */}
        {username && (
          <DigitalTwinSection
            username={username}
            analysis={analysis}
            loading={analysisLoading}
          />
        )}

        {/* Inline Filters */}
        <InlineFilters filters={filters} onChange={setFilters} />

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleStartMatch}
            className="w-full py-4 rounded-2xl soul-gradient-bg text-white font-bold text-base hover:opacity-90 transition-opacity cta-shimmer shadow-lg shadow-indigo-200/50"
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              매칭 시작
            </span>
          </button>
        </motion.div>

        {/* Subtle hint */}
        <p className="text-center text-soul-muted text-xs">
          필터를 설정하고 매칭을 시작하면 AI가 최적의 인스타 계정을 찾아드려요
        </p>
      </div>
    </main>
  )
}

export default function MatchPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-soul-bg flex items-center justify-center">
        <div className="text-soul-muted">로딩 중...</div>
      </main>
    }>
      <MatchContent />
    </Suspense>
  )
}
