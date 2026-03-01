# SoulMatch 전면 개편

팀을 짜서 병렬로 진행할 것.

## 작업 목록

### 1. 에러 수정
- 분석 시작에 실패했습니다 에러 수정
- 백엔드 /api/analyze-profile 엔드포인트와 프론트 연결 디버깅

### 2. 온보딩 리디자인 - 멀티 플랫폼 입력
- Instagram / LinkedIn / 이메일 중 선택 입력 UI 구현
- 선택한 플랫폼에 따라 다른 분석 파이프라인 호출
- 화이트 메인 테마, 깔끔하지만 고급스러운 디자인

### 3. 디지털 트윈 생성 및 관심사 분석 페이지
- 입력된 정보 기반으로 Claude API를 활용해 디지털 트윈 생성
- 관심사, 성격, 라이프스타일 분석 결과를 시각적으로 표시하는 페이지 구현
- 분석 완료 후 매칭 검색으로 자연스럽게 전환

### 4. 실제 사람 검색 - AI 기반 매칭
- Tavily 웹 검색으로 비슷한 관심사의 실제 Instagram 사용자 검색
- Browser Use로 Instagram 프로필 크롤링 (사진, 아이디, 바이오 등)
- 검색된 실제 사용자의 인스타 사진과 아이디를 우리 화면에 표시
- 하드코딩 SAMPLE_MATCHES 대신 실제 검색 결과 반환

### 5. 통합 테스트
- 기존 포트 전부 닫고 백엔드(8000) + 프론트(3000) 새로 실행
- 온보딩에서 분석, 매칭까지 전체 플로우 동작 확인
- curl로 각 API 엔드포인트 테스트

## 기술 스택
- Backend: FastAPI + Anthropic Claude API + Tavily + Browser Use
- Frontend: Next.js + Tailwind + Framer Motion
- 디자인: 화이트 메인 테마, 미니멀하지만 고급스러운 느낌

## 완료 조건
모든 작업이 완료되고 프론트+백엔드 서버가 실행되어 전체 플로우가 동작하면 아래를 출력:
<promise>SOULMATCH COMPLETE</promise>
