import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class SessionManager:
    def __init__(self):
        pass

    async def get_browser(self):
        try:
            from browser_use import Browser, BrowserConfig
            config = BrowserConfig(
                headless=False,
                disable_security=True,
            )
            return Browser(config=config)
        except ImportError:
            logger.error("browser-use not installed")
            raise

    async def get_agent(self, task: str, browser=None):
        try:
            from browser_use import Agent
            from langchain_anthropic import ChatAnthropic

            llm = ChatAnthropic(
                model_name="claude-sonnet-4-20250514",
                api_key=os.getenv("ANTHROPIC_API_KEY"),
            )

            if browser is None:
                browser = await self.get_browser()
            return Agent(task=task, llm=llm, browser=browser)
        except ImportError as e:
            logger.error(f"Import error: {e}")
            raise
