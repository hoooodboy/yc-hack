import json
import re
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class MessageGeneratorAgent:
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

    async def generate(self, sender_captions: list, target_profile: dict, common_interests: list) -> list:
        try:
            captions_text = "\n".join(sender_captions[:10]) if sender_captions else "일상적인 카페 방문, 주말 산책"

            # STEP 1: 말투 스타일 분석
            style_prompt = f"""아래 캡션들의 말투 스타일을 분석하세요. 간결하게 JSON으로 반환.

캡션:
{captions_text}

{{
  "formality": "존댓말/반말/혼합",
  "tone": "유머러스/감성적/담백한/귀여운",
  "emoji_usage": "없음/가끔/자주",
  "sentence_ending": "~요/~다/~ㅋ/~!/혼합",
  "example_patterns": ["자주 쓰는 표현 2개"]
}}"""

            style_response = self.claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                messages=[{"role": "user", "content": style_prompt}]
            )
            style_text = style_response.content[0].text

            # STEP 2: 스타일 기반 메시지 생성
            gen_prompt = f"""분석된 말투 스타일로 상대방에게 보낼 첫 DM 3개를 생성하세요.

[내 말투 스타일]
{style_text}

[내 캡션 원문]
{captions_text}

[상대방 관심사]
{target_profile.get('common_interests', target_profile.get('interests', []))}

[공통 관심사]
{common_interests}

[메시지 작성 규칙]
1. 위 분석된 말투 스타일과 동일하게 작성 (존댓말/반말, 이모지 패턴 등)
2. 50자 이내 (반드시 지킬 것)
3. 각 메시지는 다른 접근 방식 사용:
   - 메시지1: 공통으로 가는 장소/활동 언급 (예: "저도 거기 자주 가는데!")
   - 메시지2: 관심사에 대한 구체적 질문 (예: "어떤 원두 좋아하세요?")
   - 메시지3: 감성적/공감 접근 (예: "취향이 진짜 비슷한 것 같아서요")
4. 소개팅 앱 느낌 절대 X, 인스타 친구처럼 자연스럽게

반드시 JSON 배열로만 반환: ["메시지1", "메시지2", "메시지3"]"""

            response = self.claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": gen_prompt}]
            )

            text = response.content[0].text

            json_match = re.search(r'\[.*\]', text, re.DOTALL)
            if json_match:
                messages = json.loads(json_match.group())
                if isinstance(messages, list) and len(messages) >= 1:
                    return [msg[:50] for msg in messages[:3]]

            return self._default_messages(common_interests)

        except Exception as e:
            logger.error(f"Message generation failed: {e}")
            return self._default_messages(common_interests)

    def _default_messages(self, common_interests: list) -> list:
        interest = common_interests[0] if common_interests else "공통 관심사"

        TEMPLATES = {
            "등산": [
                "요즘 어느 산 다니세요? 저도 주말마다 가는데 추천 부탁드려요!",
                "등산 사진 너무 좋아서요! 혹시 같이 갈 모임 있나요?",
                "북한산 일출 사진 보고 감탄했어요. 어느 코스로 가셨어요?"
            ],
            "카페": [
                "카페 취향이 너무 비슷해요! 요즘 자주 가는 곳 어디예요?",
                "인스타에서 본 카페 진짜 분위기 좋아 보여요. 어디예요?",
                "핸드드립 vs 에스프레소 어떤 쪽이세요? 저는 핸드드립파!"
            ],
            "전시": [
                "전시 취향 진짜 좋으시네요! 요즘 본 것 중 추천 있나요?",
                "성수동 팝업 저도 가고 싶었는데! 어떠셨어요?",
                "다음 전시 같이 볼 사람 찾고 있었는데 혹시 관심 있으세요?"
            ],
            "독서": [
                "독서 취향이 비슷한 것 같아요! 최근에 뭐 읽으셨어요?",
                "그 책 저도 읽었어요! 어떤 부분이 제일 좋았어요?",
                "독립서점 자주 가세요? 추천해주실 곳 있나요?"
            ],
            "운동": [
                "운동하시는 모습 멋있어요! 어디서 하세요?",
                "러닝크루 저도 관심 있는데 어떻게 시작하셨어요?",
                "운동 루틴 궁금해요! 같이 할 수 있을까요?"
            ],
            "요리": [
                "음식 사진 너무 맛있어 보여요! 레시피 공유 가능하세요?",
                "맛집 취향이 비슷한 것 같아요. 요즘 발견한 곳 있나요?",
                "홈쿠킹 저도 하는데 추천 메뉴 있으세요?"
            ],
            "사진": [
                "사진 감성이 진짜 좋아요! 어떤 카메라 쓰세요?",
                "필름 사진 분위기 너무 좋은데 어디서 현상하세요?",
                "사진 찍으러 같이 다닐 사람 찾고 있었어요!"
            ],
            "필라테스": [
                "필라테스 저도 하는데! 어디 스튜디오 다니세요?",
                "운동 꾸준히 하시는 거 진짜 대단해요. 비결이 뭐예요?",
                "필라테스 시작한 지 얼마 되셨어요? 저도 해보고 싶어요!"
            ],
        }

        for keyword, templates in TEMPLATES.items():
            for i_interest in common_interests:
                if keyword in i_interest:
                    return templates

        return [
            f"인스타 보다가 {interest} 취향이 너무 비슷해서 말 걸어봐요!",
            f"저도 {interest} 좋아하는데 추천해주실 곳이나 팁 있나요?",
            f"관심사가 비슷해서 반가워요! {interest} 얘기 나누고 싶어요 :)"
        ]
