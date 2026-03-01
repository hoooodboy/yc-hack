import json
import re
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class ProfileBuilderAgent:
    def __init__(self):
        self._claude = None

    @property
    def claude(self):
        if self._claude is None:
            from anthropic import Anthropic
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise RuntimeError("ANTHROPIC_API_KEY not set")
            self._claude = Anthropic(api_key=api_key)
        return self._claude

    async def build_profile(self, username: str, visual_analysis: dict, text_analysis: dict, search_enrichment: dict) -> dict:
        try:
            prompt = f"""아래 분석 데이터를 통합해서 사용자 프로필 JSON을 생성하세요.

시각 분석: {json.dumps(visual_analysis, ensure_ascii=False)}
텍스트 분석: {json.dumps(text_analysis, ensure_ascii=False)}
관심사 보강: {json.dumps(search_enrichment, ensure_ascii=False)}

[관심사 태그 작성 규칙 -- 매우 중요]
- 추상적인 단어 금지. "카페" -> "스페셜티커피매니아", "등산" -> "주말등산러", "사진" -> "필름사진러버"
- 구체적이고 행동 지향적인 태그로 작성 (실제 인스타그램 해시태그처럼)
- 한국 MZ세대가 실제 사용하는 표현 사용
- 관심사 4~6개 추출
- 예시:
  - 좋은 예: "성수카페투어", "주말등산러", "전시덕후", "비건베이킹", "필라테스러버"
  - 나쁜 예: "카페", "등산", "전시", "요리", "운동"

출력 형식 (반드시 유효한 JSON):
{{
  "interests": ["구체적태그1", "구체적태그2", "구체적태그3", "구체적태그4"],
  "lifestyle": {{
    "activity_level": 7,
    "social_preference": "ambivert",
    "environment": "urban"
  }},
  "personality_big5": {{
    "openness": 8,
    "conscientiousness": 6,
    "extraversion": 5,
    "agreeableness": 7,
    "neuroticism": 4
  }},
  "communication_style": "casual"
}}"""

            response = self.claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )

            text = response.content[0].text
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                profile = json.loads(json_match.group())
            else:
                logger.warning("JSON parse failed from Claude response, using fallback")
                profile = self._default_profile()

            profile["embedding"] = []
            profile["username"] = username
            return profile

        except Exception as e:
            logger.error(f"Profile building failed: {e}")
            profile = self._default_profile()
            profile["username"] = username
            return profile

    def _default_profile(self) -> dict:
        return {
            "interests": ["카페투어러", "일상기록", "주말산책러"],
            "lifestyle": {"activity_level": 5, "social_preference": "ambivert", "environment": "urban"},
            "personality_big5": {"openness": 6, "conscientiousness": 6, "extraversion": 5, "agreeableness": 7, "neuroticism": 4},
            "communication_style": "casual"
        }
