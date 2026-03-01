import json
import re
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class MultimodalAnalyzerAgent:
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

    async def analyze_images(self, image_urls: list) -> dict:
        if not image_urls:
            return self._empty_visual()

        try:
            content = [
                {
                    "type": "text",
                    "text": """이 Instagram 게시물 이미지들을 분석하세요.
한국 Instagram 문화 컨텍스트를 고려하세요:
- 위치: 성수동, 한남동, 연남동, 을지로, 북촌 등 핫플레이스 파악
- 카페: 스페셜티커피, 디저트카페, 로스터리 등 세분화
- 패션: K-패션 트렌드 (미니멀, 뉴트럴톤, 레이어드 등)
- 운동: 헬스/필라테스/요가/등산/러닝/클라이밍 정확히 구분
- 음식: 한식/양식/일식/비건/건강식 등 세분화
- 문화: 전시/팝업/공연/독립서점/갤러리 구분

JSON으로 반환:
{
  "locations": ["성수동", "북한산", ...],
  "food_preferences": ["스페셜티커피", "비건식단", ...],
  "fashion_style": "미니멀/스트릿/포멀/캐주얼/뉴트럴",
  "social_pattern": "혼자/소규모(2-3)/그룹/혼합",
  "energy_level": 1~10,
  "aesthetic": "미니멀/감성/화려/빈티지/내추럴",
  "activities": ["필라테스", "독립서점탐방", ...],
  "lifestyle_tags": ["성수힙스터", "카페투어러", ...]
}"""
                }
            ]

            for url in image_urls[:12]:
                content.append({
                    "type": "image",
                    "source": {"type": "url", "url": url}
                })

            response = self.claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": content}]
            )

            text = response.content[0].text
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return self._empty_visual()
        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            return self._empty_visual()

    async def enrich_with_search(self, hashtags: list) -> dict:
        if not hashtags:
            return {}

        enriched = {}
        try:
            from tavily import TavilyClient
            tavily_key = os.getenv("TAVILY_API_KEY")
            if not tavily_key:
                return enriched

            tavily = TavilyClient(api_key=tavily_key)
            for tag in hashtags[:5]:
                try:
                    result = tavily.search(
                        query=f"#{tag} lifestyle community interests Korea",
                        search_depth="basic",
                        max_results=2
                    )
                    enriched[tag] = [r.get("snippet", "") for r in result.get("results", [])]
                except Exception as e:
                    logger.warning(f"Tavily search failed for #{tag}: {e}")
        except ImportError:
            logger.warning("tavily-python not installed")

        return enriched

    async def analyze_text(self, captions: list, bio: str) -> dict:
        if not captions and not bio:
            return self._empty_text()

        try:
            text_data = f"바이오: {bio}\n캡션들:\n" + "\n".join(captions[:10])

            response = self.claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{
                    "role": "user",
                    "content": f"""아래 Instagram 텍스트를 분석하세요.
한국 Instagram 문화 컨텍스트를 고려하세요:
- MZ세대 말투 패턴 (ㅋㅋ, ~슴, 갓생, 소확행 등)
- 한국 특유의 해시태그 문화 (#오운완, #카스타그램, #전시스타그램 등)
- 위치 태그에서 활동 반경 추정

텍스트:
{text_data}

JSON으로 반환:
{{
  "tone": "유머러스/진지/감성적/캐주얼/학술적",
  "formality": "존댓말/반말/혼합",
  "emoji_usage": "없음/가끔/자주",
  "sentence_length": "짧게/중간/길게",
  "keywords": ["키워드1", "키워드2", ...],
  "topics": ["주제1", "주제2", ...],
  "generation_markers": ["MZ세대 표현이나 특징적 언어 패턴"],
  "inferred_interests": ["텍스트에서 추론된 관심사 태그 (구체적으로)"]
}}"""
                }]
            )

            text = response.content[0].text
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return self._empty_text()
        except Exception as e:
            logger.error(f"Text analysis failed: {e}")
            return self._empty_text()

    def _empty_visual(self) -> dict:
        return {
            "locations": [], "food_preferences": [], "fashion_style": "캐주얼",
            "social_pattern": "혼합", "energy_level": 5, "aesthetic": "감성",
            "activities": [], "lifestyle_tags": []
        }

    def _empty_text(self) -> dict:
        return {
            "tone": "캐주얼", "formality": "혼합", "emoji_usage": "가끔",
            "sentence_length": "중간", "keywords": [], "topics": [],
            "generation_markers": [], "inferred_interests": []
        }
