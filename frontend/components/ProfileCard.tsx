'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { proxyImageUrl } from '@/lib/api'

interface ProfileCardProps {
  username: string
  profileImageUrls: string[]
  commonInterests: string[]
  aiSummary: string
  compatibilityScore: number
  isPrivate?: boolean
  recentPosts?: string[]
}

const TAG_COLORS = [
  'bg-indigo-50 text-indigo-600',
  'bg-violet-50 text-violet-600',
  'bg-blue-50 text-blue-600',
  'bg-sky-50 text-sky-600',
  'bg-purple-50 text-purple-600',
]

function getTagColor(interest: string): string {
  let hash = 0
  for (let i = 0; i < interest.length; i++) {
    hash = interest.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function CircularScore({ score, size = 48 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const strokeWidth = 2.5
  const radius = (size - strokeWidth * 2) / 2
  const circumference = radius * 2 * Math.PI
  const percent = Math.round(score * 100)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(percent), 300)
    return () => clearTimeout(timer)
  }, [percent])

  const offset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="circular-progress" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-xs">{animatedScore}%</span>
      </div>
    </div>
  )
}

function InitialAvatar({ username }: { username: string }) {
  const initial = username.charAt(0).toUpperCase()
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
      <span className="text-7xl font-bold text-indigo-300">{initial}</span>
    </div>
  )
}

function PhotoGallery({ images, username }: { images: string[]; username: string }) {
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const [direction, setDirection] = useState(0)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const photos = images.slice(0, 10).map(proxyImageUrl).filter(u => u && !failedUrls.has(u))

  const goTo = useCallback((index: number, dir: number) => {
    if (index < 0 || index >= photos.length) return
    setDirection(dir)
    setCurrentPhoto(index)
  }, [photos.length])

  if (photos.length === 0) {
    return <InitialAvatar username={username} />
  }

  if (photos.length === 1) {
    return (
      <img
        src={photos[0]}
        alt={`@${username}`}
        className="w-full h-full object-cover"
        draggable={false}
        onError={() => setFailedUrls(prev => new Set(prev).add(photos[0]))}
      />
    )
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0.5 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0.5 }),
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={currentPhoto}
          src={photos[currentPhoto]}
          alt={`@${username} photo ${currentPhoto + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onError={() => {
            setFailedUrls(prev => new Set(prev).add(photos[currentPhoto]))
            if (currentPhoto > 0) setCurrentPhoto(currentPhoto - 1)
          }}
        />
      </AnimatePresence>

      {/* Tap zones for prev / next */}
      <button
        className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-default"
        onClick={(e) => { e.stopPropagation(); goTo(currentPhoto - 1, -1) }}
        aria-label="Previous photo"
      />
      <button
        className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-default"
        onClick={(e) => { e.stopPropagation(); goTo(currentPhoto + 1, 1) }}
        aria-label="Next photo"
      />

      {/* Top progress bars (Instagram style) */}
      <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
        {photos.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: '#ffffff',
                width: i === currentPhoto ? '100%' : i < currentPhoto ? '100%' : '0%',
                opacity: i <= currentPhoto ? 1 : 0,
              }}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); goTo(i, i > currentPhoto ? 1 : -1) }}
            className={`rounded-full transition-all duration-200 ${
              i === currentPhoto
                ? 'w-2.5 h-2.5 bg-white shadow-sm'
                : 'w-2 h-2 bg-white/50'
            }`}
            aria-label={`Go to photo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function ProfileCard({
  username,
  profileImageUrls,
  commonInterests,
  aiSummary,
  compatibilityScore,
  isPrivate = false,
  recentPosts = [],
}: ProfileCardProps) {
  const [showSummary, setShowSummary] = useState(false)

  return (
    <div className="w-full h-full bg-white rounded-3xl overflow-hidden card-shadow flex flex-col">
      {/* Image area */}
      <div className="relative flex-1 min-h-0">
        <PhotoGallery images={profileImageUrls} username={username} />

        {/* Compatibility score */}
        <div className="absolute top-4 right-4 z-30 bg-soul-primary/80 backdrop-blur-sm rounded-full p-1">
          <CircularScore score={compatibilityScore} />
        </div>

        {/* Private badge */}
        {isPrivate && (
          <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-sm text-soul-text text-xs px-3 py-1.5 rounded-full font-medium">
            비공개
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-20 pointer-events-none" />
      </div>

      {/* Info area */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <a
            href={`https://instagram.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-soul-text font-bold text-lg hover:text-soul-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            @{username}
          </a>
          <span className="text-soul-muted text-xs">Instagram</span>
        </div>

        {/* Interest tags */}
        <div className="flex flex-wrap gap-2">
          {commonInterests.slice(0, 4).map(interest => (
            <span
              key={interest}
              className={`${getTagColor(interest)} text-xs px-3 py-1 rounded-full font-medium`}
            >
              {interest}
            </span>
          ))}
        </div>

        {/* AI summary toggle */}
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="text-soul-primary text-sm flex items-center gap-1 hover:opacity-70 transition-opacity font-medium"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${showSummary ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          AI 분석 {showSummary ? '접기' : '더 보기'}
        </button>

        <AnimatePresence>
          {showSummary && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-2"
            >
              <div className="bg-soul-subtle rounded-xl p-3 border border-soul-border">
                <p className="text-soul-muted text-sm leading-relaxed">{aiSummary}</p>
              </div>
              {recentPosts.length > 0 && (
                <div className="bg-soul-subtle rounded-xl p-3 border border-soul-border space-y-1.5">
                  <p className="text-soul-text text-xs font-semibold">Recent Posts</p>
                  {recentPosts.slice(0, 3).map((post, i) => (
                    <p key={i} className="text-soul-muted text-xs leading-relaxed truncate">
                      &ldquo;{post}&rdquo;
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
