# SoulMatch — YC × Browser Use Hackathon 우승 프롬프트

> **중요**: 이 프롬프트는 동일한 내용으로 7번 반복 실행된다.
> 매 iteration마다 `PROGRESS.md`를 읽어 이전에 완료된 항목을 확인하고,
> 미완료 항목을 우선순위 순서대로 실행한 뒤 완료 시 `PROGRESS.md`를 업데이트한다.

---

## 팀 역할

당신은 아래 4명의 전문가로 구성된 드림팀이다:

| 역할 | 책임 |
|------|------|
| **수준급 디자이너** | Apple·Linear 수준의 UI/UX, 감성적 다크 테마, 마이크로인터랙션 |
| **수석 프론트엔드** | Next.js 14 + Framer Motion 마스터, 성능 최적화, TypeScript 완벽 타입 |
| **수석 백엔드** | FastAPI + asyncio 전문, 견고한 API 설계, 에러 핸들링, 데모 데이터 퀄리티 |
| **AI 엔지니어** | Browser Use + Claude Vision 전문, 프롬프트 엔지니어링, 한국어 최적화 |

---

## 프로젝트 컨텍스트

- **위치**: `~/soulmatch/` (backend/ + frontend/ 구조)
- **해커톤**: YC × Browser Use Hackathon (2026-02-28~03-01, 26시간, $100k+ 상금, 우승시 YC 인터뷰 보장)
- **핵심 기술**: Browser Use(필수) + Claude claude-sonnet-4-6 Vision + Tavily + Mem0 + Next.js 14
- **심사 WOW 포인트 3개**:
  1. Browser Use가 Instagram을 실시간으로 탐색하는 화면 (라이브)
  2. 우측 스와이프 → AI가 내 말투로 메시지 3개 생성
  3. Browser Use → Instagram DM창 자동 오픈 + 메시지 입력

---

## 실행 규칙

1. 반드시 `PROGRESS.md` 파일을 먼저 읽어 현재 iteration 번호와 완료 항목 확인
2. 파일을 수정하기 전 반드시 Read 도구로 전체 내용을 읽을 것
3. TypeScript 타입 에러, Python 문법 에러가 없도록 주의
4. 기존 동작하는 코드를 파괴하지 말 것 (추가/개선만)
5. 완료한 항목은 즉시 `PROGRESS.md`에 체크 표시 후 저장
6. 한 iteration에서 너무 많은 것을 하려다 망치지 말고, 완벽하게 2~3개씩 완료

---

## 전체 태스크 목록 (우선순위 순)

### 🎨 [디자이너] UI/UX

- [ ] **D-1**: `app/page.tsx` — 랜딩 히어로 섹션 전면 재설계
  - 배경: SVG animated gradient mesh (보라/핑크 물결)
  - 타이핑 애니메이션: "진짜 잘 맞는 사람을" 문구 글자별 fade-in
  - CTA 버튼: shimmer 효과 + hover시 glow 효과
  - 소셜 프루프: "이미 1,247명이 첫 메시지를 보냈어요" (가상 카운터)

- [ ] **D-2**: `components/ProfileCard.tsx` — 카드 비주얼 업그레이드
  - 이미지 없을 때: 그라디언트 + username 이니셜 아바타
  - 카드 상단 곡선 이미지 영역 + 하단 정보 분리 레이아웃
  - 공통 관심사 태그: 각 태그마다 랜덤 파스텔 컬러 (고정)
  - 매칭 점수: 애니메이션 채워지는 원형 progress bar

- [ ] **D-3**: `app/onboarding/page.tsx` — 온보딩 UX 개선
  - 동의 체크박스: 체크 시 glassmorphism 하이라이트 효과
  - 인스타 입력: @ 프리픽스 고정 + focus 시 border glow
  - 단계 표시: 스텝 라인 애니메이션

- [ ] **D-4**: `app/analyze/page.tsx` + `components/AnalysisProgress.tsx` — 분석 화면 WOW
  - 중앙에 로고 + 파동 애니메이션 (scanner 효과)
  - 각 단계 완료 시: 체크 아이콘 팡 터지는 효과
  - 배경: 별/파티클이 천천히 이동하는 효과

- [ ] **D-5**: `app/match/page.tsx` — 스와이프 화면 완성도
  - 카드 뒤에 흐릿한 다음 카드: 더 자연스럽게 (scale + blur)
  - 하단 버튼: X는 흰색 테두리, ♥는 그라디언트 glow shadow
  - 상단 "N장 남음" 뱃지: pill shape + 그라디언트

- [ ] **D-6**: `app/dm/page.tsx` — DM 화면 감성
  - 상대 username + 공통 관심사 헤더 섹션 스타일링
  - 성공 화면: confetti 애니메이션 + 부드러운 등장

---

### ⚡ [프론트엔드] 코드 품질

- [ ] **F-1**: `components/SwipeCard.tsx` — 물리 기반 velocity 스와이프
  - `info.velocity.x`도 판단에 사용 (빠른 flick: |velocity| > 500 이면 즉시 스와이프)
  - `dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}` 추가
  - 드래그 중 카드 색조 변화 (오른쪽: 초록 tint, 왼쪽: 빨강 tint)

- [ ] **F-2**: 스켈레톤 로딩 컴포넌트 `components/SkeletonCard.tsx` 신규 생성
  - 카드 형태 shimmer 스켈레톤 (이미지 영역 + 텍스트 줄 3개)
  - `app/match/page.tsx` 로딩 중에 스켈레톤 2장 표시

- [ ] **F-3**: 페이지 전환 애니메이션
  - `app/layout.tsx`에 `AnimatePresence` wrapper 추가
  - 각 페이지 진입: y+20 → y0, opacity 0→1 (0.3s ease-out)

- [ ] **F-4**: `components/MessageSelector.tsx` — 메시지 카드 개선
  - 메시지 선택 시: 카드가 scale(1.02) + 그라디언트 border 효과
  - 각 메시지 카드 번호 배지: 그라디언트 원형 배지
  - 전송 버튼 로딩: 버튼 내 스피너 + "DM창 여는 중..." 텍스트

- [ ] **F-5**: `app/analyze/page.tsx` — 폴링 최적화
  - 완료 감지 후 `/match`로 이동 전 1초 "완료 축하" 상태 표시
  - 에러 시: 재시도 버튼 + "데모 모드로 진행하기" 옵션 (샘플 매치로 이동)

---

### 🔧 [백엔드] API 품질

- [ ] **B-1**: `backend/main.py` — SAMPLE_MATCHES 데이터 대폭 강화
  - 각 카드에 `recent_posts` 필드 추가 (최근 게시물 3개 캡션)
  - `analysis_detail` 필드: 더 풍부한 AI 분석 텍스트
  - 더 자연스럽고 다양한 프로필 스타일 (인스타 실제 사용자 느낌)

- [ ] **B-2**: `backend/main.py` — 분석 파이프라인 시뮬레이션 강화
  - `run_analysis_pipeline`에 실제 진행감 있는 단계별 delay 추가
  - API 키 없을 때: 완전한 mock 분석 결과 반환 (데모용)
  - 단계: 0%→10%→35%→70%→90%→100% 각각 1~2초 간격

- [ ] **B-3**: `backend/main.py` — `/api/analyze-profile` 개선
  - API 키 환경변수 체크: 없으면 즉시 mock 모드로 전환
  - mock 모드에서 실제 분석된 것처럼 자연스러운 관심사 태그 생성
  - mock 관심사: 사용자명에서 시드 생성해 일관된 결과

- [ ] **B-4**: `backend/agents/message_generator.py` — Fallback 품질 향상
  - API 키 없을 때 반환하는 기본 메시지 질 향상
  - 공통 관심사별 특화 메시지 템플릿 (등산/카페/독서/전시 등)

---

### 🤖 [AI 엔지니어] 프롬프트 & 에이전트

- [ ] **A-1**: `backend/agents/profile_builder.py` — 프롬프트 강화
  - 더 구체적이고 행동 지향적인 관심사 태그 생성 지시
  - 예: "카페" → "스페셜티커피매니아", "등산" → "주말등산러"
  - JSON 파싱 실패 대비 강화된 fallback 로직

- [ ] **A-2**: `backend/agents/message_generator.py` — 프롬프트 정교화
  - 말투 추출 2단계 분리 (스타일 분석 → 메시지 생성)
  - 각 메시지에 다른 접근 방식 명시 (공통장소 언급 / 관심사 질문 / 감성적 접근)
  - 50자 제한 엄격 적용 지시 + 예시 few-shot 3개 추가

- [ ] **A-3**: `backend/agents/multimodal_analyzer.py` — 분석 프롬프트 개선
  - 한국 Instagram 문화 특화 프롬프트 (성수동, 한남동, 힙스터 등 컨텍스트)
  - 더 세분화된 관심사 카테고리 (운동: 헬스/필라테스/요가/등산/러닝 구분)
  - 이미지 없을 때 텍스트만으로 더 정밀한 추론

- [ ] **A-4**: `backend/core/matching_engine.py` — 매칭 점수 개선
  - 공통 관심사 직접 계산 로직 추가 (임베딩 외 가중치)
  - 관심사 겹침 시 보너스 점수
  - 매칭 점수 0.75~0.98 범위 정규화

---

### 📋 [전체] 데모 준비

- [ ] **X-1**: `README.md` — 데모 가이드 섹션 추가
  - 5분 30초 데모 스크립트 (심사위원 앞에서 따라하기)
  - API 키 없이 mock 모드 실행 방법
  - 화면 공유 최적 설정 (브라우저 zoom, 해상도)

- [ ] **X-2**: `frontend/app/page.tsx` — 데모 모드 진입 버튼
  - "데모 보기" 버튼 → 바로 `/match`로 이동 (온보딩 스킵)
  - 심사위원 앞 데모에서 빠른 진입용

- [ ] **X-3**: 백엔드 health check 개선
  - `GET /api/health` 엔드포인트 추가
  - 환경변수 체크 결과 (API 키 설정 여부) 반환
  - mock 모드 자동 활성화 확인

---

## PROGRESS.md 업데이트 방법

각 태스크 완료 후 `~/soulmatch/PROGRESS.md` 파일에 반영:

```markdown
## Iteration N 완료 항목
- [x] D-1: 랜딩 히어로 재설계 완료
- [x] F-1: velocity 스와이프 완료
...
```

파일이 없으면 새로 생성. 반드시 현재 iteration 번호 기록.

---

## 완료 선언

모든 태스크의 체크박스가 완료되면 (또는 7번째 iteration이 끝나면):

```
<promise>SOULMATCH HACKATHON READY</promise>
```

를 출력한다.
