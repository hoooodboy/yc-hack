'use client'

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { ReactNode } from 'react'

interface SwipeCardProps {
  children: ReactNode
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

export default function SwipeCard({ children, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-250, -150, 0, 150, 250], [0, 1, 1, 1, 0])
  const likeOpacity = useTransform(x, [20, 100], [0, 1])
  const passOpacity = useTransform(x, [-100, -20], [1, 0])

  // Color tint overlays based on drag direction
  const greenOverlay = useTransform(x, [0, 150], [0, 0.15])
  const redOverlay = useTransform(x, [-150, 0], [0.15, 0])

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const velocityThreshold = 500
    const offsetThreshold = 100

    // Fast flick detection (velocity) OR sufficient distance
    if (info.velocity.x > velocityThreshold || info.offset.x > offsetThreshold) {
      onSwipeRight()
    } else if (info.velocity.x < -velocityThreshold || info.offset.x < -offsetThreshold) {
      onSwipeLeft()
    }
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      className="cursor-grab absolute inset-0 select-none"
    >
      {/* Green tint overlay (right swipe = LIKE) */}
      <motion.div
        style={{ opacity: greenOverlay }}
        className="absolute inset-0 bg-green-400 rounded-3xl z-10 pointer-events-none"
      />

      {/* Red tint overlay (left swipe = PASS) */}
      <motion.div
        style={{ opacity: redOverlay }}
        className="absolute inset-0 bg-red-400 rounded-3xl z-10 pointer-events-none"
      />

      {/* LIKE 오버레이 */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-8 left-6 z-20 border-2 border-green-400 text-green-400 px-4 py-2 rounded-xl font-bold text-lg rotate-[-20deg]"
      >
        LIKE
      </motion.div>

      {/* PASS 오버레이 */}
      <motion.div
        style={{ opacity: passOpacity }}
        className="absolute top-8 right-6 z-20 border-2 border-red-400 text-red-400 px-4 py-2 rounded-xl font-bold text-lg rotate-[20deg]"
      >
        PASS
      </motion.div>

      {children}
    </motion.div>
  )
}
