import logging
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class DMOpenerAgent:
    def __init__(self, session_manager):
        self.session = session_manager

    async def open_dm(self, target_username: str, message: str) -> bool:
        try:
            from browser_use import Agent
            from langchain_anthropic import ChatAnthropic

            browser = await self.session.get_browser()
            llm = ChatAnthropic(
                model_name="claude-sonnet-4-20250514",
                api_key=os.getenv("ANTHROPIC_API_KEY"),
            )

            agent = Agent(
                task=f"""Instagram에서 @{target_username}에게 DM 보낼 준비를 하세요.
1. https://www.instagram.com/{target_username}/ 접속
2. "메시지 보내기" 또는 "Message" 버튼 클릭
3. 메시지 입력창에 아래 텍스트 입력 (전송하지 말 것!):
   {message}
4. 입력 완료 후 'DM_READY' 반환

전송 버튼을 절대 클릭하지 마세요. 사용자가 직접 확인 후 전송합니다.""",
                llm=llm,
                browser=browser,
            )

            result = await agent.run()
            # 브라우저 닫지 않음 (사용자가 확인 후 전송)
            return "DM_READY" in str(result)

        except Exception as e:
            logger.error(f"DM opener failed for {target_username}: {e}")
            return False
