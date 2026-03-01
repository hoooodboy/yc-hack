'use client'

export default function SkeletonCard() {
  return (
    <div className="w-full h-full bg-white rounded-3xl overflow-hidden card-shadow flex flex-col">
      {/* 이미지 영역 스켈레톤 */}
      <div className="relative flex-1 skeleton" />

      {/* 정보 영역 스켈레톤 */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 skeleton rounded-lg" />
          <div className="h-4 w-16 skeleton rounded-lg" />
        </div>

        <div className="flex gap-2">
          <div className="h-6 w-20 skeleton rounded-full" />
          <div className="h-6 w-24 skeleton rounded-full" />
          <div className="h-6 w-16 skeleton rounded-full" />
        </div>

        <div className="space-y-2">
          <div className="h-3 w-full skeleton rounded" />
          <div className="h-3 w-3/4 skeleton rounded" />
        </div>
      </div>
    </div>
  )
}
