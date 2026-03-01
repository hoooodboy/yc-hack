'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface MessageSelectorProps {
  messages: string[]
  onSelect: (message: string) => void
  isLoading?: boolean
  isSending?: boolean
}

export default function MessageSelector({ messages, onSelect, isLoading = false, isSending = false }: MessageSelectorProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [edited, setEdited] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const handleSelect = (index: number) => {
    setSelected(index)
    setEdited(messages[index])
    setIsEditing(false)
  }

  const handleSend = () => {
    const message = isEditing ? edited : (selected !== null ? messages[selected] : '')
    if (message) {
      onSelect(message)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 text-center py-8">
        <div className="w-10 h-10 border-2 border-soul-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-soul-muted text-sm">AI가 메시지를 생성하고 있어요...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-soul-text font-semibold">메시지를 선택하세요</h3>

      <div className="space-y-3">
        {messages.map((message, index) => (
          <motion.button
            key={index}
            onClick={() => handleSelect(index)}
            animate={selected === index ? { scale: 1.02 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`w-full p-4 rounded-2xl text-left text-sm transition-all duration-200 border ${
              selected === index
                ? 'border-soul-primary bg-indigo-50/50 text-soul-text'
                : 'border-soul-border bg-white text-soul-muted hover:border-soul-primary/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                selected === index
                  ? 'bg-soul-primary text-white'
                  : 'bg-soul-subtle text-soul-muted'
              }`}>
                {index + 1}
              </span>
              <span className="leading-relaxed">{message}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Edit area */}
      {selected !== null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 overflow-hidden"
        >
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-soul-primary text-sm hover:opacity-70 transition-opacity font-medium"
            >
              직접 수정하기
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={edited}
                onChange={e => setEdited(e.target.value)}
                className="w-full border border-soul-border rounded-xl p-3 text-soul-text text-sm resize-none outline-none focus:border-soul-primary h-24 bg-white transition-colors"
                placeholder="메시지를 수정하세요..."
              />
              <button
                onClick={() => setIsEditing(false)}
                className="text-soul-muted text-xs hover:text-soul-text transition-colors"
              >
                수정 완료
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Send button */}
      <motion.button
        onClick={handleSend}
        disabled={selected === null || isSending}
        whileTap={selected !== null && !isSending ? { scale: 0.97 } : undefined}
        className={`w-full py-4 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
          selected !== null && !isSending
            ? 'soul-gradient-bg text-white hover:opacity-90'
            : 'bg-soul-subtle text-soul-muted cursor-not-allowed'
        }`}
      >
        {isSending ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Instagram DM 전송 중...
          </>
        ) : (
          'DM 보내기'
        )}
      </motion.button>
    </div>
  )
}
