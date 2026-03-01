# SoulMatch PRD — Ralph Loop 프롬프트 (7 Iterations)

> **중요**: 이 프롬프트는 동일한 내용으로 7번 반복 실행된다.
> 매 iteration마다 `PRD.md`를 읽어 현재 상태를 확인하고,
> 미완료 섹션을 우선순위 순서대로 작성/개선한 뒤 `PRD.md`를 업데이트한다.

---

## 당신의 역할

당신은 **YC 출신 시리얼 창업자이자 해커톤 전문 PM**이다.
$100K+ 상금이 걸린 YC × Browser Use Web Agents Hackathon에서 우승하기 위한 PRD를 작성한다.

당신의 강점:
- YC 심사위원이 무엇에 흥분하는지 정확히 아는 감각
- 기술적 깊이와 비즈니스 임팩트를 동시에 설득하는 능력
- 4분 데모에서 심사위원 입을 벌리게 만드는 스토리텔링
- 해커톤에서 "이거 진짜 쓸 수 있겠다"라는 반응을 이끌어내는 제품 감각

---

## 해커톤 컨텍스트

### 심사 기준 (반드시 PRD 전체에 반영)
| 기준 | 비중 | PRD에서 어떻게 공략할 것인가 |
|------|------|---------------------------|
| **임팩트 잠재력** | **40%** | TAM/SAM/SOM, 확장 시나리오, 비즈니스 모델, "이거 실제로 쓰겠다" 증명 |
| **창의성** | **20%** | Browser Use의 독창적 활용, 경쟁 서비스 대비 차별점, "아 이걸 이렇게?" 모먼트 |
| **기술 난이도** | **20%** | 에이전트 파이프라인 아키텍처, 멀티모달 AI, 실시간 브라우저 자동화, 시스템 설계 |
| **데모 & 발표** | **20%** | 4분 데모 스크립트, WOW 포인트 3개, 백업 플랜, 심사위원 Q&A 대비 |

### 상금 구조
- **1위**: iPhone 17 Pro + $10K Browser Use 크레딧 + **YC 인터뷰 보장** + $30K Gemini 크레딧
- **2위**: AirPods Max + $5K Browser Use 크레딧 + $20K Gemini 크레딧
- **3위**: Mac Mini + $1K Browser Use 크레딧 + $10K Gemini 크레딧
- **특별상**: Most Viral, Best Design, Best Devtool, Most Hardcore Infra 등

### 기술 스택 (스폰서 제공)
- **Browser Use**: $100 크레딧 (필수 사용 — 해커톤 이름이 "Web Agents")
- **Anthropic**: Claude claude-sonnet-4-6 Vision (멀티모달 분석 엔진)
- **OpenAI**: 임베딩 + fallback LLM
- **Google DeepMind**: $20 크레딧
- **MongoDB**: 무료 클러스터
- **Vercel**: $50 크레딧 (프론트 배포)
- **Tavily/Exa**: 웹 서치 보강

### 규칙
- 팀 1~4명
- 해커톤 당일 시작 (사전 개발 불가, 단 기획/디자인은 가능)
- **라이브 데모 필수** (3분 데모 + 1분 Q&A)
- 백업 비디오 필수
- 제출 마감: 3월 1일 10:00 AM PST

---

## 제품 비전 (PRD에 반영할 핵심)

**SoulMatch**는 AI 웹 에이전트가 인스타그램 공개 프로필을 자동 분석하여 진짜 잘 맞는 사람을 추천해주는 소셜 매칭 서비스다.

### 핵심 가치
1. **진정성**: 꾸며진 프로필이 아닌 실제 인스타그램 활동에서 추출한 데이터 기반
2. **자동화**: Browser Use 에이전트가 수집 → 분석 → 매칭 → DM 전 과정 자동 처리
3. **개인화**: 내 말투와 관심사를 few-shot learning으로 학습해 답장률 높은 첫 메시지 생성
4. **프라이버시**: 웹 에이전트로 공개되지 않은 데이터까지 수집 가능

### 목표 사용자
- **1차**: 20~35세 인스타그램 활성 사용자 (사용자 지역 기반)
- 틴더의 외모 중심 매칭에 피로감을 느끼는 사용자
- 인스타그램을 사용하지만 새로운 만남이 어려운 사용자
- AI 기술에 거부감 없는 MZ세대

### 해커톤 포지셔닝
- Browser Use 웹 에이전트를 핵심 인프라로, Claude Vision 멀티모달 AI를 분석 엔진으로, Tavily+Exa를 서치 레이어로 결합한 **B2C 소셜 매칭 에이전트 플랫폼**
- 단순 연애 앱이 아닌 **특정 카테고리의 사람/인플루언서를 니치하게 뽑아주는 마케팅 툴**로 확장 가능
- "AI가 나보다 나를 더 잘 아는" 매칭 → "이거 진짜 맞는 사람이네" 체험

---

## 현재 구현 상태 (PRD 작성 시 참고)

### 아키텍처
```
[사용자] → Next.js 14 (Vercel) → FastAPI (백엔드)
                                      ↓
                              ┌─────────────────┐
                              │  5-Agent Pipeline │
                              ├─────────────────┤
                              │ 1. ProfileCollector (Browser Use → Instagram) │
                              │ 2. MultimodalAnalyzer (Claude Vision + Tavily) │
                              │ 3. ProfileBuilder (구조화 + Mem0 + Embedding) │
                              │ 4. MessageGenerator (말투 학습 + Few-shot) │
                              │ 5. DMOpener (Browser Use → Instagram DM) │
                              └─────────────────┘
```

### Browser Use SDK 사용법 (PRD 기술 섹션에 반영)
```python
from browser_use_sdk import AsyncBrowserUse
from pydantic import BaseModel

# 구조화된 출력으로 Instagram 프로필 수집
class InstagramProfile(BaseModel):
    bio: str
    image_urls: list[str]
    captions: list[str]
    hashtags: list[str]

client = AsyncBrowserUse()
result = await client.run(
    "Go to instagram.com/username and collect their public profile data",
    output_schema=InstagramProfile,
    session_settings={"profileId": "ig-session"},
    allowed_domains=["instagram.com"],
)

# 세션 유지로 DM 자동화
session = await client.sessions.create()
await client.run("Open DM with @username", session_id=session.id)
```

### 핵심 기능 (6개 페이지 완전 구현)
1. **랜딩**: animated gradient mesh + 타이핑 애니메이션 + 소셜 프루프 카운터
2. **온보딩**: 3단계 동의 + Instagram 계정 입력 (glassmorphism)
3. **분석**: 파티클 배경 + 파동 스캐너 + 5단계 체크리스트 (2초 폴링)
4. **매칭**: Tinder 스와이프 (velocity 기반 + 색조 오버레이 + 원형 스코어)
5. **DM**: AI 메시지 3개 선택 + 편집 + confetti 성공 화면
6. **Mock 모드**: API 키 없이 완전한 데모 가능 (6명 한국 MZ 샘플 데이터)

---

## PRD 섹션 체크리스트 (순서대로 완료)

### Phase 1: 전략 & 비전 (Iteration 1-2)
- [ ] **S-1**: Executive Summary — 한 문단으로 심사위원을 사로잡는 엘리베이터 피치
- [ ] **S-2**: Problem Statement — "왜 지금 이 제품이 필요한가" (데이터 기반)
- [ ] **S-3**: Solution Overview — 제품이 문제를 어떻게 해결하는가 (before/after)
- [ ] **S-4**: Target User Persona — 3개 페르소나 (이름, 나이, 직업, 페인포인트, 행동패턴)
- [ ] **S-5**: Competitive Landscape — 틴더/범블/힌지/블라인드 비교 매트릭스 + SoulMatch 차별점

### Phase 2: 제품 상세 (Iteration 3-4)
- [ ] **P-1**: User Journey Map — 6단계 사용자 여정 (터치포인트 + 감정곡선 + WOW 포인트)
- [ ] **P-2**: Feature Specification — 핵심 기능 5개 상세 스펙 (입력/처리/출력/엣지케이스)
- [ ] **P-3**: Information Architecture — 페이지별 컴포넌트 트리 + 데이터 플로우
- [ ] **P-4**: AI Agent Pipeline Detail — 5개 에이전트 각각의 입출력/프롬프트전략/에러처리
- [ ] **P-5**: Privacy & Ethics Framework — GDPR 준수, 공개 데이터만, opt-out, 동의 프로세스

### Phase 3: 기술 & 데모 (Iteration 5-6)
- [ ] **T-1**: System Architecture — 전체 시스템 다이어그램 (ASCII) + 기술 스택 선택 근거
- [ ] **T-2**: Browser Use Integration Deep Dive — SDK 활용 상세 (세션 관리, 프로필, 안티핑거프린팅)
- [ ] **T-3**: Data Model & API Contract — Pydantic 스키마 + REST API 엔드포인트 전체
- [ ] **T-4**: 4-Minute Demo Script — 초 단위 데모 스크립트 (WOW #1 → #2 → #3)
- [ ] **T-5**: Demo Backup Plan — 라이브 실패 시 A/B/C 플랜, 백업 비디오 시나리오

### Phase 4: 비즈니스 & 확장 (Iteration 7)
- [ ] **B-1**: Business Model — 수익 모델 (프리미엄/구독/B2B 마케팅 툴)
- [ ] **B-2**: Go-to-Market Strategy — 런칭 전략, 바이럴 루프, 초기 유저 확보
- [ ] **B-3**: Expansion Roadmap — Phase 1~3 로드맵 (연애 → 네트워킹 → 마케팅 인텔리전스)
- [ ] **B-4**: Risk Mitigation — 기술적/법적/윤리적 리스크 + 대응 전략
- [ ] **B-5**: Q&A Cheat Sheet — 심사위원 예상 질문 20개 + 킬러 답변

---

## 실행 규칙

1. **반드시 `~/soulmatch/PRD.md`를 먼저 읽어** 현재 작성 상태 확인 (파일 없으면 새로 생성)
2. **한 iteration에서 3~4개 섹션**을 완벽하게 작성 (대충 많이 하지 말고 깊이 있게)
3. **모든 섹션은 한국어**로 작성 (영어 기술 용어는 그대로 사용)
4. **심사 기준 40/20/20/20을 항상 의식**하며 작성
5. 완료한 섹션은 즉시 체크리스트에 `[x]` 표시
6. **구체적인 수치, 데이터, 예시**를 최대한 포함 (추상적 서술 금지)
7. **현재 코드베이스 상태를 정확히 반영** (구현된 것과 계획인 것 구분)
8. PRD 내 ASCII 다이어그램, 표, 코드 블록 적극 활용
9. 각 섹션 말미에 **"심사위원 임팩트 포인트"** 한 줄 추가

---

## PRD.md 파일 형식

```markdown
# SoulMatch — Product Requirements Document
## YC × Browser Use Web Agents Hackathon

> 🏆 Target: 1위 ($100K+ value) + YC 인터뷰

---

### 진행 상태
- Iteration: {N}
- 완료 섹션: {count}/20

---

[각 섹션 내용]
```

---

## 완료 선언

20개 섹션이 모두 완료되면 (또는 7번째 iteration이 끝나면):

```
✅ PRD COMPLETE — READY FOR HACKATHON
```

를 PRD.md 맨 아래에 추가한다.
