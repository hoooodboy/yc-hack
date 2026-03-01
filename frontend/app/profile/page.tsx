'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getAnalysisStatus, updateProfile } from '@/lib/api'

const BIG5_LABELS: Record<string, { label: string; emoji: string }> = {
  openness: { label: '개방성', emoji: '🎨' },
  conscientiousness: { label: '성실성', emoji: '📋' },
  extraversion: { label: '외향성', emoji: '🗣' },
  agreeableness: { label: '친화성', emoji: '🤝' },
  neuroticism: { label: '민감성', emoji: '💭' },
}

const INTEREST_SUGGESTIONS = [
  '스페셜티커피매니아', '주말등산러', '전시덕후', '필라테스러버',
  '독서광', '맛집탐방', '러닝크루', '홈쿠킹', '필름사진',
  '성수팝업', '비건라이프', '요가명상', '와인초보', '캠핑러',
  '브런치탐방', '서핑초보', '자전거출퇴근', '보드게임',
]

function ProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const username = searchParams.get('username') || ''

  const [interests, setInterests] = useState<string[]>([])
  const [personality, setPersonality] = useState<Record<string, number>>({})
  const [commStyle, setCommStyle] = useState('')
  const [lifestyle, setLifestyle] = useState<Record<string, any>>({})
  const [summary, setSummary] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [newTag, setNewTag] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return
    getAnalysisStatus(username)
      .then(data => {
        const r = data.result
        if (r) {
          setInterests(r.interests || [])
          setPersonality(r.personality_big5 || {})
          setCommStyle(r.communication_style || 'casual')
          setLifestyle(r.lifestyle || {})
          setSummary(r.summary || '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [username])

  const handleAddTag = (tag: string) => {
    const t = tag.trim()
    if (t && !interests.includes(t)) {
      setInterests(prev => [...prev, t])
    }
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    setInterests(prev => prev.filter(t => t !== tag))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(username, {
        interests,
        looking_for: lookingFor,
      })
    } catch {
      // ignore - proceed anyway
    }
    setSaving(false)
    setIsEditing(false)
  }

  const handleNext = () => {
    router.push(`/match?username=${encodeURIComponent(username)}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-soul-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-soul-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const suggestions = INTEREST_SUGGESTIONS.filter(s => !interests.includes(s))

  return (
    <main className="min-h-screen bg-soul-bg flex flex-col items-center px-4 py-8">
      <div className="max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-3xl font-bold tracking-tight text-soul-text">SoulMatch</div>
          <h2 className="text-lg font-bold soul-gradient-text inline-block">나의 디지털 트윈</h2>
          <p className="text-soul-muted text-sm">AI가 분석한 당신의 프로필입니다</p>
        </div>

        {/* AI Summary */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 space-y-2"
          >
            <h3 className="text-sm font-bold text-soul-text">AI 분석 요약</h3>
            <p className="text-soul-muted text-sm leading-relaxed">{summary}</p>
          </motion.div>
        )}

        {/* Interest Tags */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-soul-text">관심사</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-soul-primary text-xs font-medium hover:underline"
            >
              {isEditing ? '완료' : '수정하기'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {interests.map(tag => (
                <motion.span
                  key={tag}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                    isEditing
                      ? 'bg-soul-primary/10 text-soul-primary border border-soul-primary/20'
                      : 'bg-soul-subtle text-soul-text'
                  }`}
                >
                  {tag}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 text-soul-primary/60 hover:text-red-500"
                    >
                      ×
                    </button>
                  )}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* Edit mode: add tags */}
          <AnimatePresence>
            {isEditing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag(newTag)}
                    placeholder="관심사 추가..."
                    className="flex-1 bg-soul-subtle rounded-xl px-3 py-2 text-sm text-soul-text placeholder-soul-muted/50 outline-none focus:ring-1 focus:ring-soul-primary/30"
                  />
                  <button
                    onClick={() => handleAddTag(newTag)}
                    disabled={!newTag.trim()}
                    className="px-3 py-2 soul-gradient-bg text-white rounded-xl text-sm font-medium disabled:opacity-30"
                  >
                    추가
                  </button>
                </div>

                {/* Suggestions */}
                <div>
                  <p className="text-xs text-soul-muted mb-2">추천 태그</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.slice(0, 8).map(s => (
                      <button
                        key={s}
                        onClick={() => handleAddTag(s)}
                        className="px-2.5 py-1 rounded-full text-xs bg-soul-subtle text-soul-muted hover:bg-soul-primary/10 hover:text-soul-primary transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Personality Big5 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 space-y-3"
        >
          <h3 className="text-sm font-bold text-soul-text">성격 분석</h3>
          <div className="space-y-2.5">
            {Object.entries(personality).map(([key, value]) => {
              const info = BIG5_LABELS[key]
              if (!info) return null
              const pct = typeof value === 'number' ? (value > 1 ? value * 10 : value * 100) : 50
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-soul-text">
                      {info.emoji} {info.label}
                    </span>
                    <span className="text-soul-muted">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 bg-soul-subtle rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                      className="h-full rounded-full soul-gradient-bg"
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-soul-muted">소통 스타일:</span>
            <span className="text-xs font-medium text-soul-text bg-soul-subtle px-2.5 py-0.5 rounded-full">
              {commStyle === 'casual' ? '캐주얼' : commStyle === 'formal' ? '포멀' : commStyle}
            </span>
          </div>
        </motion.div>

        {/* Looking For */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5 space-y-3"
        >
          <h3 className="text-sm font-bold text-soul-text">어떤 사람을 찾고 있나요?</h3>
          <textarea
            value={lookingFor}
            onChange={e => setLookingFor(e.target.value)}
            placeholder="예: 같이 카페 투어 다닐 사람, 주말에 등산 갈 친구, 전시 취향 비슷한 사람..."
            rows={3}
            className="w-full bg-soul-subtle rounded-xl px-4 py-3 text-sm text-soul-text placeholder-soul-muted/50 outline-none resize-none focus:ring-1 focus:ring-soul-primary/30 leading-relaxed"
          />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full soul-gradient-bg text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : '변경사항 저장'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full soul-gradient-bg text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity"
            >
              매칭 시작하기
            </button>
          )}
          <p className="text-center text-soul-muted text-xs">
            관심사를 수정하면 더 정확한 매칭 결과를 받을 수 있어요
          </p>
        </motion.div>
      </div>
    </main>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-soul-bg flex items-center justify-center">
        <div className="text-soul-muted">로딩 중...</div>
      </main>
    }>
      <ProfileContent />
    </Suspense>
  )
}
