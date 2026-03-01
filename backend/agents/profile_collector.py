import asyncio
import json
import re
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class ProfileCollectorAgent:
    def __init__(self, session_manager):
        self.session = session_manager

    async def collect(self, instagram_username: str) -> dict:
        try:
            from browser_use import Agent
            from langchain_anthropic import ChatAnthropic

            browser = await self.session.get_browser()
            llm = ChatAnthropic(
                model_name="claude-sonnet-4-20250514",
                api_key=os.getenv("ANTHROPIC_API_KEY"),
            )

            agent = Agent(
                task=f"""Instagram에서 @{instagram_username}의 공개 프로필을 분석하세요.
수집 항목:
1. 최근 게시물 12개의 이미지 URL과 캡션 텍스트
2. 바이오 텍스트
3. 사용 해시태그 (캡션에서 추출, TOP 20)
4. 게시물 빈도 (최근 3개월 게시물 수)
비공개 계정이면 is_private: true 포함.
반드시 아래 JSON 형식으로 반환:
{{
  "username": "{instagram_username}",
  "bio": "바이오",
  "image_urls": ["url1", ...],
  "captions": ["캡션1", ...],
  "hashtags": ["tag1", ...],
  "post_frequency": 숫자,
  "is_private": false
}}""",
                llm=llm,
                browser=browser,
            )

            history = await agent.run()
            await browser.close()

            # AgentHistoryList -> final_result() 또는 extracted_content()
            final = history.final_result()
            if final:
                text = str(final)
            else:
                content = history.extracted_content()
                text = "\n".join(content) if content else ""

            if not text:
                return self._empty_profile(instagram_username)

            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())

            return self._empty_profile(instagram_username)

        except Exception as e:
            logger.error(f"Profile collection failed for {instagram_username}: {e}")
            return self._empty_profile(instagram_username)

    def _empty_profile(self, username: str) -> dict:
        return {
            "username": username,
            "bio": "",
            "image_urls": [],
            "captions": [],
            "hashtags": [],
            "post_frequency": 0,
            "is_private": False,
            "error": "collection_failed"
        }

    async def collect_with_retry(self, username: str, max_retries: int = 3) -> dict:
        for attempt in range(max_retries):
            try:
                result = await self.collect(username)
                if "error" not in result:
                    return result
            except Exception as e:
                logger.warning(f"Attempt {attempt+1} failed: {e}")
                if attempt == max_retries - 1:
                    return self._empty_profile(username)
                await asyncio.sleep(2 ** attempt)
        return self._empty_profile(username)
