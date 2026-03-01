const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export interface MatchCard {
  username: string
  profile_image_urls: string[]
  common_interests: string[]
  ai_summary: string
  compatibility_score: number
  is_private: boolean
  recent_posts?: string[]
  analysis_detail?: string
  estimated_followers?: number
  estimated_gender?: string
}

export interface MatchFilters {
  gender?: string        // 'male' | 'female' | 'all'
  min_followers?: number
  max_followers?: number
  content_type?: string  // 'food' | 'travel' | 'art' | 'fitness' | 'fashion' | 'beauty' | 'music' | 'lifestyle'
  location?: string
  age_range?: string     // '20대 초반' | '20대 중후반' | '30대 초반' | '30대 중후반'
}

export interface AnalysisStatus {
  username: string
  status: string
  progress: number
  current_step: string
  result?: {
    interests: string[]
    lifestyle: Record<string, any>
    personality_big5: Record<string, number>
    communication_style: string
    summary?: string
  }
}

async function fetchJSON(path: string, options?: RequestInit) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error')
    throw new Error(`API Error ${response.status}: ${error}`)
  }
  return response.json()
}

export async function analyzeProfile(inputType: string, inputValue: string): Promise<{ status: string; message: string }> {
  return fetchJSON('/api/analyze-profile', {
    method: 'POST',
    body: JSON.stringify({ input_type: inputType, input_value: inputValue }),
  })
}

export async function getAnalysisStatus(username: string): Promise<AnalysisStatus> {
  return fetchJSON(`/api/analysis-status/${encodeURIComponent(username)}`)
}

export async function getMatches(username?: string, filters?: MatchFilters): Promise<MatchCard[]> {
  const searchParams = new URLSearchParams()
  if (username) searchParams.set('username', username)
  if (filters) {
    if (filters.gender && filters.gender !== 'all') searchParams.set('gender', filters.gender)
    if (filters.min_followers !== undefined) searchParams.set('min_followers', String(filters.min_followers))
    if (filters.max_followers !== undefined) searchParams.set('max_followers', String(filters.max_followers))
    if (filters.content_type) searchParams.set('content_type', filters.content_type)
    if (filters.location && filters.location !== 'all') searchParams.set('location', filters.location)
    if (filters.age_range && filters.age_range !== 'all') searchParams.set('age_range', filters.age_range)
  }
  const qs = searchParams.toString()
  const data = await fetchJSON(`/api/matches${qs ? `?${qs}` : ''}`)
  return data.matches || data
}

export async function generateMessages(
  senderUsername: string,
  targetUsername: string,
  commonInterests: string[]
): Promise<{ messages: string[]; target_username: string }> {
  return fetchJSON('/api/generate-messages', {
    method: 'POST',
    body: JSON.stringify({
      sender_username: senderUsername,
      target_username: targetUsername,
      common_interests: commonInterests,
    }),
  })
}

export async function updateProfile(
  username: string,
  data: { interests?: string[]; looking_for?: string }
): Promise<{ status: string; result: any }> {
  return fetchJSON(`/api/profile/${encodeURIComponent(username)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export interface OpenDMResult {
  success: boolean
  message: string
  message_sent?: boolean
  message_typed?: boolean
  instagram_url?: string
}

export async function openDM(
  targetUsername: string,
  message: string
): Promise<OpenDMResult> {
  return fetchJSON('/api/open-dm', {
    method: 'POST',
    body: JSON.stringify({
      target_username: targetUsername,
      message,
    }),
  })
}

/**
 * 이미지 URL을 프론트엔드에서 접근 가능한 URL로 변환
 * - /api/photos/... 로컬 캐시 URL → 백엔드 URL로 변환
 * - 일반 URL (Unsplash 등) → 그대로 반환
 */
export function proxyImageUrl(url: string): string {
  if (!url) return ''
  // 백엔드 로컬 캐시 URL
  if (url.startsWith('/api/photos/')) {
    return `${BACKEND_URL}${url}`
  }
  return url
}
