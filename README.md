# SoulMatch — AI 소셜 매칭 웹 에이전트

YC × Browser Use Hackathon MVP

Browser Use 웹 에이전트가 Instagram 공개 프로필을 자동 분석하여 진짜 잘 맞는 사람을 추천해주는 소셜 매칭 서비스.

## 핵심 기술 스택

- **웹 에이전트**: Browser Use (Python SDK)
- **멀티모달 AI**: Claude claude-sonnet-4-6 Vision
- **웹 서치**: Tavily + Exa.ai
- **에이전트 메모리**: Mem0
- **임베딩**: OpenAI text-embedding-3-small
- **백엔드**: FastAPI + asyncio
- **프론트엔드**: Next.js 14 + Framer Motion + Tailwind CSS
- **데이터베이스**: MongoDB Atlas

## 프로젝트 구조

```
soulmatch/
├── backend/                    # FastAPI + Browser Use 에이전트
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── agents/
│   │   ├── profile_collector.py   # Agent 1: Browser Use Instagram 수집
│   │   ├── multimodal_analyzer.py # Agent 2: Claude Vision + Tavily
│   │   ├── profile_builder.py     # Agent 3: 프로필 JSON + Mem0
│   │   ├── dm_opener.py           # Agent 4: Browser Use DM 자동화
│   │   └── message_generator.py   # Agent 5: Claude 말투 학습 메시지
│   ├── core/
│   │   ├── session_manager.py     # Instagram 세션 관리
│   │   ├── matching_engine.py     # 임베딩 유사도 계산
│   │   └── database.py            # MongoDB 연결
│   ├── models/
│   │   └── schemas.py             # Pydantic 스키마
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # Next.js 14
│   ├── app/
│   │   ├── page.tsx               # 랜딩 페이지
│   │   ├── onboarding/page.tsx    # 온보딩 (동의 + 로그인)
│   │   ├── analyze/page.tsx       # 프로필 분석 중 화면
│   │   ├── match/page.tsx         # 카드 스와이프 메인
│   │   └── dm/page.tsx            # DM 메시지 선택 화면
│   ├── components/
│   │   ├── SwipeCard.tsx          # Framer Motion 카드 컴포넌트
│   │   ├── ProfileCard.tsx        # 추천 카드 UI
│   │   ├── MessageSelector.tsx    # AI 메시지 선택 UI
│   │   └── AnalysisProgress.tsx   # 분석 진행 상태 표시
│   ├── lib/
│   │   └── api.ts                 # 백엔드 API 클라이언트
│   └── .env.local.example
│
├── .env                        # API 키 (placeholder)
└── README.md
```

## 빠른 시작

### 1. 환경 변수 설정

```bash
cp .env backend/.env
# .env 파일에 실제 API 키 입력
```

### 2. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# http://localhost:8000/docs 에서 Swagger UI 확인
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000 에서 확인
```

## 에이전트 파이프라인

```
[온보딩]
  → Agent 1: Profile Collector (Browser Use → Instagram 공개 프로필 수집)
  → Agent 2: Multimodal Analyzer (Claude Vision + Tavily 해시태그 보강)
  → Agent 3: Profile Builder (구조화 JSON + Mem0 저장)
  → [Matching Engine] (임베딩 코사인 유사도)
  → [Card Swipe UI] (Framer Motion)
  → Agent 4: DM Opener (Browser Use → Instagram DM창 자동 오픈)
  → Agent 5: Message Generator (Claude few-shot 말투 학습)
```

## 데모 시나리오 (5분 30초)

1. **WOW #1**: Browser Use가 Instagram 실시간 탐색 → Claude Vision 분석 → 관심사 추출
2. **WOW #2**: 오른쪽 스와이프 → AI가 내 말투로 메시지 3가지 생성
3. **WOW #3**: Browser Use → Instagram DM창 자동 오픈 + 메시지 입력

## 데모 가이드 (심사위원용)

### Mock 모드로 빠르게 실행하기

API 키 없이도 전체 UI/UX를 체험할 수 있습니다:

```bash
# 백엔드 (API 키 없으면 자동 Mock 모드)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 프론트엔드
cd frontend
npm install
npm run dev
```

Mock 모드 확인: `GET http://localhost:8000/api/health` → `"mock_mode": true`

### 5분 30초 데모 스크립트

| 시간 | 화면 | 설명 | 포인트 |
|------|------|------|--------|
| 0:00 | 랜딩 | 타이핑 애니메이션, gradient mesh 배경 | 디자인 퀄리티 |
| 0:30 | 온보딩 | 동의 체크 → @ 입력 → 분석 시작 | UX 흐름 |
| 1:00 | 분석 중 | **WOW #1** Scanner + 파티클, 단계별 진행 | Browser Use 실시간 |
| 2:00 | 스와이프 | 카드 스택, velocity 스와이프, 원형 매칭 점수 | 인터랙션 |
| 3:00 | DM 메시지 | **WOW #2** AI 메시지 3종 선택 | 말투 학습 |
| 4:00 | DM 전송 | **WOW #3** Browser Use DM창 자동 오픈 | 자동화 |
| 4:30 | 성공 | Confetti 애니메이션 | 감성 |
| 5:00 | 요약 | 기술 스택 설명, Browser Use 핵심 역할 | 기술 깊이 |

### 화면 공유 최적 설정

- 브라우저: Chrome, 화면 너비 ~420px (모바일 시뮬레이터)
- 확대: `cmd + +` 로 125~150% 확대
- 다크 모드 배경과 어울리게 OS 다크 모드 권장
- 랜딩 "데모 보기" 버튼으로 온보딩 스킵 가능

### 빠른 진입 (데모 보기)

랜딩 페이지에서 "데모 보기" 버튼 클릭 → 바로 스와이프 화면으로 이동 (온보딩 스킵)

---

## Privacy & Ethics

- 공개 게시물만 수집
- 명시적 동의 체크박스 필수
- 비공개 계정 수집 없음
- 자동 DM 전송 없음 (사용자 확인 후 전송)
- GDPR Article 6 준수
- soulmatch.app/optout 에서 분석 제외 신청 가능
