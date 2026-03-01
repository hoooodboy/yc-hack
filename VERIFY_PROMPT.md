# SoulMatch 검증 랄프루프 프롬프트 (5 Iterations)

> **중요**: 이 프롬프트는 동일한 내용으로 5번 반복 실행된다.
> 매 iteration마다 코드를 검증하고, 발견된 문제를 수정한 뒤 `VERIFY_LOG.md`를 업데이트한다.

---

## 당신의 역할

당신은 **시니어 풀스택 QA 엔지니어**이다.
SoulMatch 프로젝트의 프론트엔드(Next.js 14)와 백엔드(FastAPI)를 철저히 검증하고 발견된 버그를 즉시 수정한다.

---

## 검증 항목 체크리스트

### 1. 빌드 검증
- [ ] `cd ~/soulmatch/frontend && npx next build` — TypeScript 컴파일 에러 없음
- [ ] `cd ~/soulmatch/backend && python -c "from main import app; print('OK')"` — Python import 에러 없음
- [ ] 모든 import 경로가 올바른지 확인

### 2. 프론트엔드-백엔드 연동 검증
- [ ] `frontend/lib/api.ts`의 `analyzeProfile(inputType, inputValue)` 시그니처가 `backend/models/schemas.py`의 `AnalyzeProfileRequest`와 일치
- [ ] 프론트엔드 온보딩에서 보내는 JSON `{ input_type, input_value }`가 백엔드에서 올바르게 파싱됨
- [ ] `getAnalysisStatus(username)` — 백엔드의 analysis_status 키와 일치하는지 확인
- [ ] `getMatches(username)` — 백엔드 응답 형식과 프론트엔드 MatchCard 인터페이스 일치 확인
- [ ] `generateMessages` / `openDM` 요청/응답 스키마 일치 확인

### 3. 페이지 플로우 검증
- [ ] 랜딩(/) → 온보딩(/onboarding) → 분석(/analyze) → 매칭(/match) → DM(/dm) 전체 플로우에서 데이터 전달이 끊기지 않는지 확인
- [ ] 온보딩에서 platform 선택 → input 입력 → consent → API 호출 플로우가 정상인지 코드 추적
- [ ] 분석 페이지에서 username 파라미터가 올바르게 전달되는지 확인
- [ ] 매치 페이지에서 스와이프 후 DM 페이지로 데이터 전달 확인

### 4. 에러 핸들링 검증
- [ ] API 키 없을 때 mock 모드가 정상 동작하는지 확인 (분석 → 매칭 → 메시지 전체)
- [ ] "분석 시작에 실패했습니다" 에러가 더 이상 발생하지 않는지 확인
- [ ] 네트워크 에러 시 재시도 + 데모 모드 fallback이 있는지 확인
- [ ] 각 에이전트(profile_collector, multimodal_analyzer 등)에서 예외 발생 시 graceful fallback

### 5. 디자인/테마 검증
- [ ] tailwind.config.ts의 soul-* 색상이 화이트 프리미엄 테마에 맞는지 확인
- [ ] globals.css의 커스텀 클래스들이 올바르게 정의되어 있는지 확인
- [ ] 모든 페이지가 일관된 디자인 토큰 사용하는지 확인

### 6. 코드 품질
- [ ] 미사용 import 제거
- [ ] TypeScript any 타입 최소화
- [ ] Python 타입 힌트 올바른지
- [ ] 하드코딩된 값이 적절한지 (URL, 색상 등)

---

## 실행 규칙

1. **반드시 `~/soulmatch/VERIFY_LOG.md`를 먼저 읽어** 이전 iteration에서 확인한 내용 파악
2. **매 iteration마다 다른 영역을 깊이 있게 검증** (대충 전부 보지 말고 2-3개 영역 집중)
3. **버그 발견 시 즉시 코드 수정** (수정 후 VERIFY_LOG.md에 기록)
4. **수정 전 반드시 Read로 파일 전체 내용 확인**
5. 파일을 수정하기 전 반드시 Read 도구로 전체 내용을 읽을 것
6. 기존 동작하는 코드를 파괴하지 말 것

---

## Iteration별 집중 영역

- **Iteration 1**: 빌드 검증 (TypeScript + Python import) + 치명적 에러 수정
- **Iteration 2**: 프론트엔드-백엔드 연동 (API 스키마 매칭 + 데이터 플로우)
- **Iteration 3**: 페이지 플로우 전체 추적 (데이터 전달 끊김 확인)
- **Iteration 4**: 에러 핸들링 + mock 모드 완전성
- **Iteration 5**: 디자인 일관성 + 코드 품질 + 최종 빌드 확인

---

## VERIFY_LOG.md 형식

```markdown
# SoulMatch 검증 로그

## Iteration N
### 검증 항목
- [x] 항목: 결과 설명
- [ ] 항목: 문제 발견 → 수정 내용

### 발견된 버그
1. 파일명:라인 — 문제 설명 → 수정 완료/미완료

### 수정한 파일
- 파일경로: 수정 내용 요약
```

---

## 완료 선언

5번째 iteration이 끝나고 모든 검증 항목이 통과하면:

```
VERIFICATION COMPLETE
```

를 VERIFY_LOG.md 맨 아래에 추가한다.
