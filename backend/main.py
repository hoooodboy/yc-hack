import os
import json
import random
import asyncio
import logging
import re
import hashlib
from typing import Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore
    logging.getLogger(__name__).warning("httpx not installed — Instagram photo scraping disabled")

try:
    from browser_use_sdk import AsyncBrowserUse
except ImportError:
    AsyncBrowserUse = None  # type: ignore
    logging.getLogger(__name__).warning("browser-use-sdk not installed — Browser Use Cloud scraping disabled")

from models.schemas import (
    AnalyzeProfileRequest,
    MessageRequest,
    OpenDMRequest,
    InputType,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SoulMatch API",
    description="AI 소셜 매칭 웹 에이전트 - Browser Use + Claude Vision",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 분석 상태 인메모리 (MVP용)
analysis_status: dict = {}

# AI 매칭 결과 캐시 (username -> matches)
match_cache: dict = {}

# Instagram 사진 URL 캐시 (username -> list[str])
photo_cache: dict[str, list[str]] = {}

# ---------------------------------------------------------------------------
# Mem0 클라이언트 초기화
# ---------------------------------------------------------------------------
_mem0_client = None
_mem0_key = os.getenv("MEM0_API_KEY", "")
if _mem0_key and not _mem0_key.startswith("your_"):
    try:
        from mem0 import MemoryClient
        _mem0_client = MemoryClient(api_key=_mem0_key)
        logger.info("Mem0 메모리 레이어 활성화")
    except Exception as e:
        logger.warning(f"Mem0 초기화 실패: {e}")


async def mem0_store_profile(username: str, profile: dict) -> None:
    """Mem0에 사용자 디지털 트윈 프로필 저장"""
    if not _mem0_client:
        return
    try:
        messages = [
            {"role": "user", "content": f"@{username}의 디지털 트윈 프로필"},
            {"role": "assistant", "content": json.dumps(profile, ensure_ascii=False)},
        ]
        _mem0_client.add(messages, user_id=f"soulmatch:{username}")
        logger.info(f"Mem0: profile stored for {username}")
    except Exception as e:
        logger.warning(f"Mem0 store failed for {username}: {e}")


async def mem0_get_profile(username: str) -> dict | None:
    """Mem0에서 사용자 프로필 조회"""
    if not _mem0_client:
        return None
    try:
        memories = _mem0_client.get_all(user_id=f"soulmatch:{username}")
        if memories:
            logger.info(f"Mem0: found {len(memories)} memories for {username}")
            return {"memories": memories}
    except Exception as e:
        logger.warning(f"Mem0 get failed for {username}: {e}")
    return None


# ---------------------------------------------------------------------------
# Browser Use Cloud SDK 헬퍼
# ---------------------------------------------------------------------------

async def browser_use_scrape_instagram(username: str) -> dict | None:
    """Browser Use Cloud SDK로 Instagram 프로필 스크래핑 (로그인 없이)"""
    browser_use_key = os.getenv("BROWSER_USE_API_KEY")
    if not AsyncBrowserUse or not browser_use_key:
        return None

    task = (
        f"Go to https://www.instagram.com/{username}/ . "
        f"Wait for the profile page to load fully. "
        f"Collect the following information and return as JSON:\n"
        f"1. bio: The bio text\n"
        f"2. followers: Follower count (number only)\n"
        f"3. captions: The text captions from the first 6 visible posts\n"
        f"4. hashtags: All hashtags found in captions\n"
        f"5. image_urls: The src URLs of the first 6 post images\n"
        f"6. is_private: Whether the account is private (true/false)\n"
        f"Return ONLY valid JSON, no other text."
    )

    try:
        client = AsyncBrowserUse(api_key=browser_use_key)
        result = await asyncio.wait_for(client.run(task=task), timeout=60.0)

        result_text = ""
        if isinstance(result, str):
            result_text = result
        elif isinstance(result, dict):
            return result
        else:
            result_text = str(result)

        # JSON 추출
        json_match = re.search(r'\{[^{}]*\}', result_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())

        logger.warning(f"Browser Use: could not parse JSON for @{username}")
        return None

    except asyncio.TimeoutError:
        logger.warning(f"Browser Use: timeout for @{username} (60s)")
        return None
    except Exception as e:
        logger.warning(f"Browser Use scrape failed for @{username}: {e}")
        return None


# ---------------------------------------------------------------------------
# Instagram DM 전송 — Playwright 직접 제어 (primary)
# ---------------------------------------------------------------------------
_IG_COOKIES_PATH = os.path.join(os.path.dirname(__file__), "ig_cookies.json")


async def playwright_send_dm(target_username: str, message: str) -> dict:
    """Playwright로 Instagram DM 메시지를 직접 전송.

    Playwright의 fill()/type()은 contenteditable div에서도 동작하므로
    Browser Use Cloud SDK보다 메시지 입력이 훨씬 안정적이다.

    Returns:
        dict with keys:
            - message_sent: bool
            - dm_opened: bool
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("playwright not installed — cannot send DM via Playwright")
        return {"message_sent": False, "dm_opened": False}

    ig_email = os.getenv("IG_EMAIL", "")
    ig_password = os.getenv("IG_PASSWORD", "")
    if not ig_email or not ig_password:
        return {"message_sent": False, "dm_opened": False}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 720},
        )

        try:
            # 저장된 쿠키 로드
            if os.path.exists(_IG_COOKIES_PATH):
                try:
                    with open(_IG_COOKIES_PATH, "r") as f:
                        cookies = json.load(f)
                    await context.add_cookies(cookies)
                    logger.info("Playwright: loaded saved IG cookies")
                except Exception:
                    pass

            page = await context.new_page()

            # --- 로그인 체크 ---
            await page.goto("https://www.instagram.com/", timeout=30000)
            await page.wait_for_load_state("networkidle", timeout=15000)

            if "/accounts/login" in page.url or await page.locator('input[name="username"]').count() > 0:
                logger.info("Playwright: not logged in — logging in")
                if "/accounts/login" not in page.url:
                    await page.goto("https://www.instagram.com/accounts/login/", timeout=30000)

                await page.wait_for_selector('input[name="username"]', timeout=10000)
                await page.fill('input[name="username"]', ig_email)
                await page.fill('input[name="password"]', ig_password)
                await page.click('button[type="submit"]')
                await page.wait_for_timeout(5000)

                # 팝업 닫기 (최대 3번)
                for _ in range(3):
                    try:
                        not_now = page.locator("text=Not Now")
                        if await not_now.first.is_visible(timeout=3000):
                            await not_now.first.click()
                            await page.wait_for_timeout(1500)
                    except Exception:
                        break

                # 로그인 성공 확인
                if "/accounts/login" in page.url:
                    logger.error("Playwright: login failed — still on login page")
                    return {"message_sent": False, "dm_opened": False}

                logger.info("Playwright: login successful")
            else:
                logger.info("Playwright: already logged in (cookies)")

            # 쿠키 저장
            cookies = await context.cookies()
            with open(_IG_COOKIES_PATH, "w") as f:
                json.dump(cookies, f)

            # --- 프로필 페이지 이동 ---
            await page.goto(
                f"https://www.instagram.com/{target_username}/",
                timeout=30000,
            )
            await page.wait_for_load_state("networkidle", timeout=15000)
            logger.info(f"Playwright: navigated to @{target_username} profile")

            # --- Message 버튼 클릭 ---
            msg_btn = page.locator(
                'div[role="button"]:has-text("Message"), '
                'div[role="button"]:has-text("메시지"), '
                'button:has-text("Message"), '
                'button:has-text("메시지 보내기")'
            )
            await msg_btn.first.click(timeout=10000)
            logger.info("Playwright: clicked Message button")
            await page.wait_for_timeout(3000)

            dm_opened = True

            # --- 메시지 입력 ---
            # Instagram DM 입력란: contenteditable div with role="textbox"
            # 여러 textbox가 있을 수 있으므로 (검색 등) 마지막 것 사용
            textbox = page.locator('[role="textbox"][contenteditable="true"]')
            count = await textbox.count()
            if count == 0:
                # placeholder 기반 fallback
                textbox = page.locator(
                    'div[aria-label="Message"], '
                    'div[aria-label="메시지 입력..."], '
                    'textarea[placeholder*="Message"], '
                    'div[data-lexical-editor="true"]'
                )
                count = await textbox.count()

            if count == 0:
                logger.error("Playwright: could not find message input field")
                return {"message_sent": False, "dm_opened": True}

            target_box = textbox.last
            await target_box.click()
            await page.wait_for_timeout(500)
            logger.info(f"Playwright: found {count} textbox(es), clicking last one")

            # fill() → contenteditable div에서도 동작
            await target_box.fill(message)
            await page.wait_for_timeout(300)

            # fill이 안 됐으면 type()으로 재시도
            content = await target_box.text_content() or ""
            if message not in content:
                logger.info("Playwright: fill() didn't work, trying type()")
                await target_box.click()
                await page.keyboard.press("Control+a")
                await page.keyboard.press("Backspace")
                await target_box.type(message, delay=30)
                await page.wait_for_timeout(300)

            # --- 전송 (Enter) ---
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(2000)
            logger.info(f"Playwright: message sent to @{target_username}")

            # 쿠키 재저장
            cookies = await context.cookies()
            with open(_IG_COOKIES_PATH, "w") as f:
                json.dump(cookies, f)

            return {"message_sent": True, "dm_opened": True}

        except Exception as e:
            logger.error(f"Playwright DM failed for @{target_username}: {e}")
            return {"message_sent": False, "dm_opened": True}
        finally:
            await browser.close()


# ---------------------------------------------------------------------------
# Instagram DM 전송 — Browser Use Cloud SDK (fallback)
# ---------------------------------------------------------------------------
_browser_use_session_id: str | None = None


async def browser_use_send_dm(target_username: str, message: str) -> dict:
    """Browser Use Cloud SDK fallback — 로그인이 필요하므로 현재 비활성화.

    Browser Use Cloud는 해외(브라질 등) 서버에서 실행되어
    Instagram 비정상 로그인 감지를 유발하므로 DM 전송에 사용하지 않는다.
    Playwright(로컬)가 유일한 DM 전송 수단.
    """
    logger.info("Browser Use Cloud DM skipped — uses foreign servers that trigger IG security")
    return {"message_sent": False, "dm_opened": False}


async def send_instagram_dm(target_username: str, message: str) -> dict:
    """Instagram DM 전송 — 우선순위: Playwright > Browser Use Cloud > 링크 fallback."""

    # 1차: Playwright 직접 제어 (가장 안정적)
    result = await playwright_send_dm(target_username, message)
    if result["message_sent"]:
        return result

    logger.info("Playwright DM failed — trying Browser Use Cloud fallback")

    # 2차: Browser Use Cloud SDK
    result = await browser_use_send_dm(target_username, message)
    if result["message_sent"]:
        return result

    # 3차: 모두 실패
    return {"message_sent": False, "dm_opened": result.get("dm_opened", False)}

# Unsplash 프로필 이미지 랜덤 풀
UNSPLASH_PROFILE_IMAGES = [
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400",
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400",
    "https://images.unsplash.com/photo-1517365830460-955ce3be0547?w=400",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400",
]

# 데모용 샘플 매치 데이터 (한국 SNS 사용자 스타일)
SAMPLE_MATCHES = [
    {
        "username": "jiyeon_daily",
        "profile_image_urls": [
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400",
            "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400"
        ],
        "common_interests": ["스페셜티커피매니아", "미니멀라이프", "독서모임"],
        "ai_summary": "조용한 카페에서 혼자 시간 보내기를 좋아하는 내향적 타입. 미니멀한 감성, 깊이 있는 대화 선호. 주 3회 이상 게시물 올리는 활발한 인스타 유저. 성수동·한남동 카페 투어 자주 다님.",
        "compatibility_score": 0.94,
        "is_private": False,
        "recent_posts": [
            "오늘도 새로운 원두 발견 ☕ 에티오피아 예가체프 내추럴, 블루베리 향이 진짜 대박",
            "미니멀한 하루. 필요한 것만 남기면 마음도 가벼워져요",
            "이번 주 읽은 책 3권째. 무라카미 하루키 새 에세이 추천합니다"
        ],
        "analysis_detail": "게시물 톤: 차분하고 감성적. 해시태그 분석 결과 카페·독서·미니멀리즘 관련 키워드 빈도 높음. 사진 스타일은 밝은 톤의 미니멀 감성. 캡션 길이 평균 50자 이상으로 성찰적 글쓰기 경향.",
        "estimated_followers": 28000,
        "estimated_gender": "female"
    },
    {
        "username": "minjun_explore",
        "profile_image_urls": [
            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
        ],
        "common_interests": ["주말등산러", "필름사진", "로스터리카페"],
        "ai_summary": "북한산·관악산 등산 마니아, 필름 카메라(Contax T2)로 풍경 담기 좋아함. 에너지 넘치는 활동파이지만 혼자만의 시간도 소중히 여김. 짧고 감성적인 캡션 스타일.",
        "compatibility_score": 0.89,
        "is_private": False,
        "recent_posts": [
            "북한산 백운대 일출 🏔 새벽 4시에 일어난 보람이 있다",
            "필름 현상 찾으러 가는 길. 이번 롤은 Portra 400으로",
            "등산 후에는 역시 수제버거. 이태원 맛집 발견 🍔"
        ],
        "analysis_detail": "아웃도어·사진 관련 콘텐츠가 80% 이상. 필름 카메라 커뮤니티 활동. 주말마다 등산 인증샷 패턴 확인. 에너지 레벨 높지만 감성적 면모도 공존.",
        "estimated_followers": 45000,
        "estimated_gender": "male"
    },
    {
        "username": "seoyeon_artsy",
        "profile_image_urls": [
            "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400",
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
            "https://images.unsplash.com/photo-1517365830460-955ce3be0547?w=400"
        ],
        "common_interests": ["전시덕후", "성수팝업", "브런치탐방"],
        "ai_summary": "성수동 팝업과 전시회 단골. 브랜드 감성 잘 아는 마케터 느낌. 화려하진 않지만 세련된 취향, 새로운 경험 추구형. 함께 탐험하기 좋은 타입.",
        "compatibility_score": 0.86,
        "is_private": False,
        "recent_posts": [
            "성수동 새로 오픈한 디올 팝업 다녀옴. 공간 디자인이 미쳤어요",
            "이번 주말 국립현대미술관. 이건희 컬렉션 진짜 꼭 보세요",
            "연남동 브런치 카페에서 늦은 아침 🥞 여유로운 일요일"
        ],
        "analysis_detail": "전시·팝업스토어·카페 관련 게시물 위주. 시각적 감각이 뛰어나고 공간 디자인에 관심. 위치 태그 분석: 성수동(35%), 한남동(20%), 연남동(15%). 트렌드에 민감한 얼리어답터 성향.",
        "estimated_followers": 62000,
        "estimated_gender": "female"
    },
    {
        "username": "junho_bookworm",
        "profile_image_urls": [
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"
        ],
        "common_interests": ["독서광", "독립서점탐방", "철학에세이"],
        "ai_summary": "독립서점 탐방, 아렌트와 까뮈 인용문 올리는 사색형. 긴 캡션 쓰는 스타일, 지적 대화에 열려 있음. Big5 개방성 최상위, 내향성 중간.",
        "compatibility_score": 0.82,
        "is_private": False,
        "recent_posts": [
            "\"사람은 생각하는 대로 살지 않으면, 사는 대로 생각하게 된다\" — 폴 발레리",
            "망원동 독립서점 '초판본살롱'에서 보낸 오후. 숨겨진 보석 같은 곳",
            "이번 달 읽은 책: 한강 '소년이 온다', 무라카미 '기사단장 죽이기'"
        ],
        "analysis_detail": "텍스트 중심 게시물. 인용구·서평·독서 기록이 주류. 캡션 평균 길이 120자 이상. 인문학·철학 관련 해시태그 다수. 독립서점 위치 태그 빈번. 지적 호기심과 깊은 사고를 선호하는 INFJ 추정.",
        "estimated_followers": 15000,
        "estimated_gender": "male"
    },
    {
        "username": "hana_fitness",
        "profile_image_urls": [
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
            "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400"
        ],
        "common_interests": ["필라테스러버", "건강식단", "러닝크루"],
        "ai_summary": "주 5회 필라테스 + 주말 한강 러닝크루 활동. 건강한 라이프스타일을 추구하며 셀프케어에 진심인 타입. 밝고 긍정적인 에너지, 함께 운동할 사람을 찾는 중.",
        "compatibility_score": 0.79,
        "is_private": False,
        "recent_posts": [
            "오늘 필라테스 100회 달성! 🎉 꾸준함이 답이다",
            "한강 러닝크루 10km 완주 🏃\u200d♀️ 같이 뛸 사람 구해요~",
            "오늘의 식단: 그릭요거트볼 + 아보카도 토스트. 건강하게 먹는 게 진짜 맛있어"
        ],
        "analysis_detail": "피트니스·건강 관련 게시물 70%. 운동 루틴 공유와 식단 기록이 주류. 러닝 크루·필라테스 스튜디오 태그 빈번. 긍정적 톤의 동기부여 콘텐츠. 사회적 활동을 즐기는 외향적 성격.",
        "estimated_followers": 38000,
        "estimated_gender": "female"
    },
    {
        "username": "_private_user_",
        "profile_image_urls": [],
        "common_interests": ["요가명상", "비건베이킹"],
        "ai_summary": "비공개 계정입니다. 바이오 기반 분석: 요가·명상·비건 라이프스타일 추구. '마음 챙김 실천 중 🧘\u200d♀️' 바이오에서 건강 중심적 생활 패턴 추정.",
        "compatibility_score": 0.76,
        "is_private": True,
        "recent_posts": [],
        "analysis_detail": "비공개 계정으로 바이오 텍스트만 분석 가능. 바이오 키워드: 요가, 명상, 비건, 마음챙김. 팔로잉 목록 중 공개 계정 분석 결과 웰니스·명상 관련 계정 다수 팔로우.",
        "estimated_followers": None,
        "estimated_gender": "unknown"
    }
]


# Mock 모드 감지: API 키 없으면 자동 mock
MOCK_MODE = not bool(os.getenv("ANTHROPIC_API_KEY"))
_tavily_key = os.getenv("TAVILY_API_KEY", "")
TAVILY_AVAILABLE = bool(_tavily_key) and not _tavily_key.startswith("your_")
if MOCK_MODE:
    logger.info("MOCK MODE: API 키 없음 — 데모 데이터로 실행합니다")
else:
    logger.info("LIVE MODE: API 키 감지됨")
    if TAVILY_AVAILABLE:
        logger.info("Tavily API 사용 가능 — 실제 사람 검색 활성화")
    else:
        logger.info("Tavily API 미설정 — Claude 기반 실제 계정 추천 모드")


@app.get("/")
async def root():
    return {"message": "SoulMatch API", "version": "1.0.0", "status": "running"}


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "mock_mode": MOCK_MODE,
        "api_keys": {
            "anthropic": bool(os.getenv("ANTHROPIC_API_KEY")),
            "tavily": bool(os.getenv("TAVILY_API_KEY")),
            "browseruse": bool(os.getenv("BROWSER_USE_API_KEY")),
            "mem0": bool(_mem0_client),
        }
    }


PHOTO_CACHE_DIR = os.path.join(os.path.dirname(__file__), "photo_cache")
os.makedirs(PHOTO_CACHE_DIR, exist_ok=True)


@app.get("/api/photos/{username}/{index}")
async def serve_cached_photo(username: str, index: int):
    """로컬에 캐시된 Instagram 이미지 서빙"""
    user_dir = os.path.join(PHOTO_CACHE_DIR, username)
    photo_path = os.path.join(user_dir, f"{index}.jpg")
    if not os.path.exists(photo_path):
        raise HTTPException(status_code=404, detail="Photo not found")
    with open(photo_path, "rb") as f:
        data = f.read()
    return Response(
        content=data,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
        },
    )


async def download_and_cache_photos(username: str, urls: list[str]) -> list[str]:
    """모든 이미지를 로컬에 다운로드하고 /api/photos/ URL 반환.

    Instagram CDN, Unsplash, 기타 URL 모두 로컬 캐시에 저장.
    다운로드 실패 시 Unsplash 폴백 이미지로 대체.
    항상 /api/photos/username/index 형태의 안정적 URL 반환.
    """
    if not urls or httpx is None:
        return urls

    user_dir = os.path.join(PHOTO_CACHE_DIR, username)
    os.makedirs(user_dir, exist_ok=True)

    cached_urls: list[str] = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/*",
        "Referer": "https://www.instagram.com/",
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        for i, url in enumerate(urls[:10]):
            local_url = f"/api/photos/{username}/{i}"
            photo_path = os.path.join(user_dir, f"{i}.jpg")

            # 이미 다운로드된 파일이 있으면 스킵
            if os.path.exists(photo_path) and os.path.getsize(photo_path) > 1000:
                cached_urls.append(local_url)
                continue

            # 모든 URL을 로컬에 다운로드 시도
            downloaded = False
            try:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    with open(photo_path, "wb") as f:
                        f.write(resp.content)
                    cached_urls.append(local_url)
                    downloaded = True
                    logger.info(f"Cached photo {i} for @{username} ({len(resp.content)} bytes)")
                else:
                    logger.warning(f"Photo download failed for @{username}[{i}]: HTTP {resp.status_code}, size {len(resp.content) if resp.status_code == 200 else 'N/A'}")
            except Exception as e:
                logger.warning(f"Photo download error for @{username}[{i}]: {e}")

            # 다운로드 실패 시 Unsplash 폴백 이미지 다운로드
            if not downloaded:
                fallback_url = UNSPLASH_PROFILE_IMAGES[i % len(UNSPLASH_PROFILE_IMAGES)]
                try:
                    resp = await client.get(fallback_url, headers={"Accept": "image/*"})
                    if resp.status_code == 200 and len(resp.content) > 1000:
                        with open(photo_path, "wb") as f:
                            f.write(resp.content)
                        cached_urls.append(local_url)
                        logger.info(f"Fallback photo {i} cached for @{username} (Unsplash)")
                    else:
                        logger.warning(f"Fallback download also failed for @{username}[{i}]")
                except Exception as e:
                    logger.warning(f"Fallback download error for @{username}[{i}]: {e}")

    return cached_urls


@app.post("/api/analyze-profile")
async def analyze_profile(request: AnalyzeProfileRequest, background_tasks: BackgroundTasks):
    # 하위 호환: username만 보낸 경우 -> instagram으로 처리
    input_type = request.input_type
    input_value = request.input_value or request.username

    if not input_value:
        raise HTTPException(status_code=400, detail="input_value 또는 username이 필요합니다")

    # 식별자 키 (분석 상태 추적용)
    clean_value = input_value.strip()
    if input_type == InputType.instagram:
        identifier = clean_value.lstrip("@")
    elif input_type == InputType.linkedin:
        # LinkedIn URL에서 ID 추출: linkedin.com/in/username → username
        li_match = re.search(r'linkedin\.com/in/([A-Za-z0-9_-]+)', clean_value)
        identifier = li_match.group(1) if li_match else clean_value
    elif input_type == InputType.email:
        # 이메일에서 @ 앞부분 추출
        identifier = clean_value.split("@")[0] if "@" in clean_value else clean_value
    else:
        identifier = clean_value.lstrip("@")

    analysis_status[identifier] = {
        "username": identifier,
        "input_type": input_type.value,
        "input_value": input_value,
        "status": "analyzing",
        "progress": 0,
        "current_step": "분석 준비 중..."
    }

    if MOCK_MODE:
        background_tasks.add_task(run_mock_analysis_pipeline, identifier, input_type)
    else:
        background_tasks.add_task(run_analysis_pipeline, identifier, input_type)

    platform_label = {"instagram": "Instagram", "linkedin": "LinkedIn", "email": "이메일"}.get(input_type.value, "")
    return {
        "status": "analyzing",
        "message": f"{platform_label} 분석을 시작했습니다 (30~90초 소요)",
        "username": identifier
    }


@app.get("/api/analysis-status/{username}")
async def get_analysis_status(username: str):
    if username not in analysis_status:
        raise HTTPException(status_code=404, detail=f"No analysis found for {username}")
    return analysis_status[username]


@app.put("/api/profile/{username}")
async def update_profile(username: str, body: dict):
    """사용자가 디지털 트윈 프로필을 수정"""
    if username not in analysis_status:
        raise HTTPException(status_code=404, detail=f"No analysis found for {username}")

    status = analysis_status[username]
    result = status.get("result", {})

    if "interests" in body:
        result["interests"] = body["interests"]
    if "looking_for" in body:
        result["looking_for"] = body["looking_for"]

    status["result"] = result
    # 캐시 무효화 (수정된 관심사로 다시 매칭) — 필터 포함된 모든 캐시 키 제거
    keys_to_remove = [k for k in match_cache if k.endswith(f":{username}")]
    for k in keys_to_remove:
        match_cache.pop(k, None)

    return {"status": "updated", "result": result}


def _build_cache_key(
    username: str,
    gender: Optional[str] = None,
    min_followers: Optional[int] = None,
    max_followers: Optional[int] = None,
    content_type: Optional[str] = None,
    location: Optional[str] = None,
    age_range: Optional[str] = None,
) -> str:
    """필터를 포함한 캐시 키 생성 — 같은 유저라도 필터가 다르면 다른 캐시."""
    parts = [
        username or "",
        gender or "",
        str(min_followers or ""),
        str(max_followers or ""),
        content_type or "",
        location or "",
        age_range or "",
    ]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:16] + f":{username}"


@app.get("/api/matches")
async def get_matches(
    username: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    min_followers: Optional[int] = Query(None),
    max_followers: Optional[int] = Query(None),
    content_type: Optional[str] = Query(None),
    location: Optional[str] = Query("Seoul"),
    age_range: Optional[str] = Query(None),
):
    filters = {
        "gender": gender,
        "min_followers": min_followers,
        "max_followers": max_followers,
        "content_type": content_type,
        "location": location,
        "age_range": age_range,
    }

    # username이 없어도 실제 매칭 생성 (anonymous 모드)
    effective_username = username or "anonymous"
    cache_key = _build_cache_key(effective_username, gender, min_followers, max_followers, content_type, location, age_range)
    if cache_key in match_cache:
        cached = match_cache[cache_key]
        return {"matches": cached, "total": len(cached)}

    matches = await generate_ai_matches(effective_username, filters=filters)
    if matches:
        match_cache[cache_key] = matches
        return {"matches": matches, "total": len(matches)}

    return {"matches": SAMPLE_MATCHES, "total": len(SAMPLE_MATCHES)}


@app.post("/api/generate-messages")
async def generate_messages(request: MessageRequest):
    sender_username = request.sender_username
    target_username = request.target_username
    common_interests = request.common_interests

    try:
        if not MOCK_MODE:
            from agents.message_generator import MessageGeneratorAgent

            sender_captions = analysis_status.get(sender_username, {}).get("captions", [
                "오늘도 좋아하는 카페에서 \U0001faf6",
                "주말 산책 기록. 요즘 이 길이 좋아",
                "드디어 읽기 시작! 기대된다"
            ])

            all_matches = list(SAMPLE_MATCHES)
            for cached_matches in match_cache.values():
                all_matches.extend(cached_matches)
            target_profile = next(
                (m for m in all_matches if m["username"] == target_username),
                {"interests": common_interests or ["공통 관심사"]}
            )

            generator = MessageGeneratorAgent()
            messages = await generator.generate(sender_captions, target_profile, common_interests)
            return {"messages": messages, "target_username": target_username}

    except Exception as e:
        logger.error(f"Message generation error: {e}")

    # Mock / fallback 메시지
    interest = common_interests[0] if common_interests else "공통 관심사"
    return {
        "messages": [
            f"{interest} 좋아하시는 것 같던데, 어떻게 시작하셨어요?",
            f"저도 {interest} 관심 있는데 추천해주실 만한 곳 있나요?",
            "인스타 보다가 취향이 너무 비슷해서 용기 내서 연락드렸어요 \U0001f60a"
        ],
        "target_username": target_username
    }


@app.post("/api/open-dm")
async def open_dm(request: OpenDMRequest):
    target_username = request.target_username
    message = request.message
    ig_url = f"https://ig.me/m/{target_username}"

    if MOCK_MODE:
        return {
            "success": True,
            "message_sent": False,
            "message_typed": False,
            "message": "DM창이 열렸어요! 확인 후 전송하세요 (데모 모드)",
            "instagram_url": ig_url,
        }

    # Playwright → Browser Use Cloud 순으로 DM 전송 시도
    dm_result = await send_instagram_dm(target_username, message)

    if dm_result.get("message_sent"):
        return {
            "success": True,
            "message_sent": True,
            "message_typed": True,
            "message": f"@{target_username}에게 메시지가 전송됐어요!",
            "instagram_url": ig_url,
        }

    if dm_result.get("dm_opened"):
        return {
            "success": True,
            "message_sent": False,
            "message_typed": False,
            "message": f"DM창이 열렸지만 메시지 전송에 실패했어요. 직접 보내주세요",
            "instagram_url": ig_url,
        }

    # Browser Use 실패 — Instagram 앱 링크 제공
    return {
        "success": True,
        "message_sent": False,
        "message_typed": False,
        "message": f"메시지가 준비됐어요! Instagram에서 @{target_username}에게 직접 보내주세요",
        "instagram_url": ig_url,
    }


# ---------------------------------------------------------------------------
# Tavily 기반 실제 사람 검색
# ---------------------------------------------------------------------------

async def search_people_with_tavily(
    interests: list[str],
    location: str = "Seoul",
    filters: Optional[dict] = None,
) -> list[dict]:
    """Tavily API로 관심사 기반 실제 Instagram 사용자 검색.

    filters 예시: {"gender": "female", "min_followers": 10000, "max_followers": 100000,
                   "content_type": "food", "location": "Seoul"}
    """
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        return []

    try:
        from tavily import TavilyClient
        tavily = TavilyClient(api_key=tavily_key)
    except Exception as e:
        logger.error(f"Tavily client init failed: {e}")
        return []

    filters = filters or {}
    location = filters.get("location") or location

    # --- 필터 → 쿼리 수식어 조합 ---
    gender_modifier = ""
    if filters.get("gender"):
        g = filters["gender"].lower()
        if g in ("male", "남성"):
            gender_modifier = "남성 인플루언서"
        elif g in ("female", "여성"):
            gender_modifier = "여성 인플루언서"

    follower_modifier = ""
    min_f = filters.get("min_followers")
    max_f = filters.get("max_followers")
    if min_f and max_f:
        follower_modifier = f"팔로워 {min_f}~{max_f}"
    elif min_f:
        follower_modifier = f"팔로워 {min_f} 이상"
    elif max_f:
        follower_modifier = f"마이크로 인플루언서 팔로워 {max_f} 이하"

    content_type_modifier = ""
    if filters.get("content_type"):
        content_type_modifier = filters["content_type"]

    age_modifier = ""
    if filters.get("age_range"):
        age_modifier = filters["age_range"]

    extra_parts = " ".join(p for p in [gender_modifier, follower_modifier, content_type_modifier, age_modifier] if p)

    found_people: list[dict] = []
    seen_usernames: set[str] = set()

    # 모든 쿼리를 병렬로 실행
    all_queries = []
    for interest in interests[:4]:
        all_queries.append((interest, f"Instagram {interest} {location} {extra_parts} influencer".strip()))
        all_queries.append((interest, f"인스타그램 {interest} {extra_parts} 추천 계정".strip()))

    async def _search(interest: str, query: str):
        try:
            return interest, await asyncio.to_thread(
                tavily.search, query=query, search_depth="basic", max_results=5,
            )
        except Exception as e:
            logger.warning(f"Tavily search failed for '{query}': {e}")
            return interest, {"results": []}

    results = await asyncio.gather(*[_search(i, q) for i, q in all_queries])

    for interest, result in results:
        for r in result.get("results", []):
            url = r.get("url", "")
            snippet = r.get("snippet", "")
            title = r.get("title", "")
            ig_match = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', url)
            if ig_match:
                uname = ig_match.group(1)
                if uname in seen_usernames or uname in ("p", "reel", "explore", "accounts", "stories", "direct"):
                    continue
                seen_usernames.add(uname)
                found_people.append({
                    "username": uname,
                    "source_url": url,
                    "snippet": snippet,
                    "title": title,
                    "matched_interest": interest,
                })

    logger.info(f"Tavily found {len(found_people)} people for interests: {interests} filters: {filters}")
    return found_people[:10]


async def scrape_instagram_profile(username: str) -> dict:
    """Browser Use로 Instagram 프로필 스크래핑"""
    try:
        from core.session_manager import SessionManager
        from agents.profile_collector import ProfileCollectorAgent

        session_mgr = SessionManager()
        collector = ProfileCollectorAgent(session_mgr)
        return await collector.collect(username)
    except Exception as e:
        logger.warning(f"Instagram scrape failed for {username}: {e}")
        return {
            "username": username,
            "bio": "",
            "image_urls": [],
            "captions": [],
            "hashtags": [],
            "post_frequency": 0,
            "is_private": False,
            "error": "scrape_failed"
        }


async def scrape_instagram_photos(username: str, max_photos: int = 10) -> list[str]:
    """Browser Use Cloud SDK로 Instagram 유저의 포스트 이미지 수집.

    1차: Browser Use Cloud API로 인스타 프로필 접속 → 로그인 → 스크롤 → 이미지 URL 추출
    2차 (폴백): Tavily + httpx embed 방식
    인메모리 캐시로 동일 유저 재스크래핑 방지.
    실패 시 빈 리스트 반환 (호출자가 Unsplash 폴백 처리).
    """
    # 캐시 확인
    if username in photo_cache:
        logger.info(f"Photo cache hit for @{username} ({len(photo_cache[username])} photos)")
        return photo_cache[username][:max_photos]

    collected: list[str] = []
    seen: set[str] = set()

    def _add(url: str) -> None:
        if url and url not in seen and len(collected) < max_photos:
            seen.add(url)
            collected.append(url)

    def _extract_urls_from_text(text: str) -> list[str]:
        """Browser Use 결과 텍스트에서 이미지 URL 추출."""
        urls: list[str] = []
        # scontent CDN URLs (Instagram 이미지)
        urls.extend(re.findall(r'https?://scontent[^\s\'"<>,]+', text))
        # imginn.com CDN URLs (Browser Use가 imginn으로 리다이렉트할 수 있음)
        urls.extend(re.findall(r'https?://[^\s\'"<>,]*imginn[^\s\'"<>,]+', text))
        # instagram CDN fbcdn URLs
        urls.extend(re.findall(r'https?://[^\s\'"<>,]*fbcdn[^\s\'"<>,]+\.jpg[^\s\'"<>,]*', text))
        # 일반적인 이미지 URL 패턴 (.jpg, .webp)
        urls.extend(re.findall(r'https?://[^\s\'"<>,]+\.(?:jpg|jpeg|webp|png)(?:\?[^\s\'"<>,]*)?', text))
        return urls

    # ── 1차: Browser Use Cloud API (로그인 없이 공개 프로필만) ──
    browser_use_key = os.getenv("BROWSER_USE_API_KEY")

    if AsyncBrowserUse is not None and browser_use_key:
        try:
            client = AsyncBrowserUse(api_key=browser_use_key)

            task_prompt = (
                f"Go to https://www.instagram.com/{username}/ \n"
                f"Scroll down 3 times slowly to load more posts. "
                f"Extract the image URLs (src attributes) from all the post thumbnail images "
                f"in the profile grid. Return ONLY the image URLs, one per line, "
                f"up to {max_photos} URLs. Do not include profile picture or story URLs."
            )

            logger.info(f"Browser Use Cloud: scraping photos for @{username}...")
            result = await client.run(task=task_prompt)

            # 결과에서 URL 추출
            result_text = ""
            if isinstance(result, str):
                result_text = result
            elif isinstance(result, dict):
                # SDK가 dict를 반환할 수 있음
                result_text = result.get("output", "") or result.get("result", "") or json.dumps(result)
            else:
                result_text = str(result)

            if result_text:
                extracted = _extract_urls_from_text(result_text)
                for url in extracted:
                    # 작은 썸네일/프로필 이미지 필터링
                    if "150x150" in url or "44x44" in url or "s150x" in url:
                        continue
                    _add(url)

            if collected:
                logger.info(f"Browser Use Cloud: scraped {len(collected)} photo(s) for @{username}")
                # 즉시 다운로드하여 로컬 캐시
                cached = await download_and_cache_photos(username, collected[:max_photos])
                photo_cache[username] = cached
                return cached
            else:
                logger.warning(f"Browser Use Cloud: no photos extracted for @{username}, falling back to Tavily")

        except Exception as e:
            logger.warning(f"Browser Use Cloud failed for @{username}: {e}, falling back to Tavily")

    # ── 2차 (폴백): Tavily + httpx embed 방식 ──
    tavily_key = os.getenv("TAVILY_API_KEY")
    shortcodes: list[str] = []
    seen_sc: set[str] = set()
    if tavily_key:
        try:
            from tavily import TavilyClient
            tavily = TavilyClient(api_key=tavily_key)
            try:
                result = await asyncio.to_thread(
                    tavily.search,
                    query=f"site:instagram.com {username} posts",
                    search_depth="basic",
                    max_results=15,
                    include_images=True,
                )
                for r in result.get("results", []):
                    url = r.get("url", "")
                    m = re.search(r'instagram\.com/(?:p|reel)/([A-Za-z0-9_-]+)', url)
                    if m and m.group(1) not in seen_sc:
                        seen_sc.add(m.group(1))
                        shortcodes.append(m.group(1))
            except Exception as e:
                logger.debug(f"Tavily post search failed: {e}")
        except Exception as e:
            logger.debug(f"Tavily init failed for photo search: {e}")

    logger.info(f"Fallback: found {len(shortcodes)} post shortcodes for @{username} via Tavily")

    # 각 포스트의 /embed/ 페이지에서 실제 이미지 추출
    if httpx is not None and shortcodes:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "text/html",
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as hx_client:
            fetch_tasks = [
                hx_client.get(f"https://www.instagram.com/p/{sc}/embed/", headers=headers)
                for sc in shortcodes[:15]
            ]
            responses = await asyncio.gather(*fetch_tasks, return_exceptions=True)
            for resp in responses:
                if isinstance(resp, Exception) or resp.status_code != 200:
                    continue
                html = resp.text
                for img_url in re.findall(r'src="(https://scontent[^"]+)"', html):
                    img_url = img_url.replace("&amp;", "&")
                    if ".js" in img_url:
                        continue
                    if "150x150" in img_url or "s150x" in img_url or "44x44" in img_url:
                        continue
                    if "240x240" in img_url or "320x320" in img_url:
                        continue
                    _add(img_url)
                if len(collected) >= max_photos:
                    break

    # 프로필 embed에서 추가 이미지 시도
    if httpx is not None and len(collected) < max_photos:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "text/html",
            }
            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as hx_client:
                resp = await hx_client.get(f"https://www.instagram.com/{username}/embed/", headers=headers)
                if resp.status_code == 200:
                    html = resp.text
                    for img_url in re.findall(r'src="(https://scontent[^"]+)"', html):
                        img_url = img_url.replace("&amp;", "&")
                        if ".js" in img_url or "150x150" in img_url or "44x44" in img_url:
                            continue
                        _add(img_url)
        except Exception as e:
            logger.debug(f"Profile embed scrape failed for @{username}: {e}")

    logger.info(f"Scraped {len(collected)} photo(s) for @{username} (fallback)")
    # 즉시 다운로드하여 로컬 캐시
    cached = await download_and_cache_photos(username, collected[:max_photos])
    photo_cache[username] = cached
    return cached


async def build_match_from_tavily_result(person: dict, user_interests: list[str]) -> dict:
    """Tavily 검색 결과 + Claude AI로 풍부한 MatchCard 생성"""
    username = person["username"]
    snippet = person.get("snippet", "")
    title = person.get("title", "")
    matched_interest = person.get("matched_interest", "")

    # 공통 관심사 (먼저 계산 — 병렬 작업에 필요 없음)
    common = [matched_interest] if matched_interest else []
    for ui in user_interests:
        if ui not in common:
            common.append(ui)
        if len(common) >= 3:
            break

    # 사진 스크래핑과 Claude enrichment를 병렬 실행
    async def _scrape():
        return await scrape_instagram_photos(username, max_photos=10)

    async def _enrich():
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            enrich_prompt = f"""Instagram 사용자 @{username}의 프로필을 풍부하게 분석해 한국어로 작성하세요.

검색 정보:
- 제목: {title}
- 스니펫: {snippet}
- 매칭된 관심사: {matched_interest}

아래 JSON만 출력하세요:
{{
  "summary": "@{username}에 대한 3-4문장 설명 (한국어). 실제 활동, 콘텐츠 스타일, 성격 추정 포함.",
  "posts": ["인스타 캡션 1", "캡션 2", "캡션 3"],
  "estimated_followers": 50000,
  "estimated_gender": "female 또는 male 또는 unknown",
  "estimated_age_range": "20대 초반 또는 20대 중반 또는 20대 후반 또는 30대 초반 또는 30대 중반 또는 기타",
  "is_personal_account": true,
  "analysis_detail": "활동 패턴 2-3문장 분석"
}}

estimated_followers는 숫자만. estimated_gender는 "female", "male", "unknown" 중 하나.
estimated_age_range는 게시물/바이오 기반 추정 연령대.
is_personal_account는 브랜드/기업/미디어 계정이면 false, 개인 계정이면 true."""
            resp = await asyncio.to_thread(
                client.messages.create,
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": enrich_prompt}],
            )
            raw = resp.content[0].text.strip()
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Claude enrichment failed for {username}: {e}")
            return None

    scraped_photos, enriched = await asyncio.gather(_scrape(), _enrich())

    # 사진 결과 처리
    if scraped_photos:
        profile_images = scraped_photos
    else:
        rng = random.Random(sum(ord(c) for c in username))
        shuffled = UNSPLASH_PROFILE_IMAGES.copy()
        rng.shuffle(shuffled)
        fallback_urls = shuffled[:rng.randint(1, 3)]
        # Unsplash도 로컬 캐시에 저장
        profile_images = await download_and_cache_photos(username, fallback_urls)

    # Claude enrichment 결과 처리
    summary = ""
    recent_posts = []
    estimated_followers: Optional[int] = None
    estimated_gender: str = "unknown"
    analysis_detail = f"Tavily 웹 검색으로 발견된 실제 Instagram 계정. '{matched_interest}' 관심사와 매칭."
    if enriched:
        summary = enriched.get("summary", "")
        recent_posts = enriched.get("posts", [])
        estimated_followers = enriched.get("estimated_followers")
        if isinstance(estimated_followers, str):
            estimated_followers = int(re.sub(r'[^0-9]', '', estimated_followers) or 0) or None
        estimated_gender = enriched.get("estimated_gender", "unknown")
        if estimated_gender not in ("female", "male", "unknown"):
            estimated_gender = "unknown"
        if enriched.get("analysis_detail"):
            analysis_detail = enriched["analysis_detail"]

    if not summary:
        summary = snippet or f"@{username} — {matched_interest} 관련 활동을 하는 Instagram 사용자. 비슷한 관심사를 공유하고 있어요."
    if len(summary) > 300:
        summary = summary[:297] + "..."

    rng_score = random.Random(sum(ord(c) for c in username))
    base_score = 0.80 + rng_score.uniform(0, 0.15)

    # 개인 계정 여부
    is_personal = True
    estimated_age = ""
    if enriched:
        is_personal = enriched.get("is_personal_account", True)
        estimated_age = enriched.get("estimated_age_range", "")

    return {
        "username": username,
        "profile_image_urls": profile_images,
        "common_interests": common[:4],
        "ai_summary": summary,
        "compatibility_score": round(base_score, 2),
        "is_private": False,
        "recent_posts": recent_posts[:3],
        "analysis_detail": analysis_detail,
        "estimated_followers": estimated_followers,
        "estimated_gender": estimated_gender,
        "estimated_age_range": estimated_age,
        "is_personal_account": is_personal,
    }


# ---------------------------------------------------------------------------
# AI 매칭 결과 생성
# ---------------------------------------------------------------------------

async def generate_ai_matches(username: str, filters: Optional[dict] = None) -> list | None:
    """사용자 관심사 기반 매칭 프로필 생성 (Tavily + Claude)"""
    filters = filters or {}
    try:
        status = analysis_status.get(username, {})
        result = status.get("result", {})
        interests = result.get("interests", [])
        personality = result.get("personality_big5", {})
        captions = status.get("captions", [])

        # 관심사가 없으면 기본 관심사로 검색
        if not interests:
            interests = ["카페", "여행", "맛집", "일상"]

        # content_type 필터가 있으면 interests 앞에 추가
        if filters.get("content_type") and filters["content_type"] not in interests:
            interests = [filters["content_type"]] + interests

        # 1. Tavily로 실제 사람 검색 시도
        if TAVILY_AVAILABLE:
            found_people = await search_people_with_tavily(interests, filters=filters)
            if found_people:
                # 병렬로 매치 빌드 (사진 스크래핑 + Claude 동시 처리)
                tasks = [
                    build_match_from_tavily_result(person, interests)
                    for person in found_people[:5]
                ]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                matches = []
                for r in results:
                    if isinstance(r, Exception):
                        logger.warning(f"Match build failed: {r}")
                        continue
                    # 브랜드/기업 계정 필터링 — 개인 계정만 포함
                    if r.get("is_personal_account") is False:
                        logger.info(f"Filtered out brand account: @{r.get('username')}")
                        continue
                    matches.append(r)
                if matches:
                    logger.info(f"Tavily-based matches for {username}: {len(matches)} (filtered personal only)")
                    return matches

        # 2. Mock 모드면 Claude 호출 없이 프로필 생성
        if MOCK_MODE:
            return _generate_mock_matches(interests, username)

        # 3. Claude로 실제 인스타그램 계정 추천
        from anthropic import Anthropic
        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        personality_str = ", ".join(f"{k}: {v:.2f}" for k, v in personality.items()) if personality else "정보 없음"
        captions_str = "\n".join(f"- {c}" for c in captions[:5]) if captions else "캡션 없음"
        interests_str = ", ".join(interests)
        looking_for = result.get("looking_for", "")

        # 필터 정보를 프롬프트에 반영
        filter_instructions = []
        if filters.get("gender"):
            g = filters["gender"].lower()
            if g in ("male", "남성"):
                filter_instructions.append("- 성별: 남성 인플루언서/크리에이터만 추천")
            elif g in ("female", "여성"):
                filter_instructions.append("- 성별: 여성 인플루언서/크리에이터만 추천")
        if filters.get("min_followers") or filters.get("max_followers"):
            min_f = filters.get("min_followers", 0)
            max_f = filters.get("max_followers", 0)
            if min_f and max_f:
                filter_instructions.append(f"- 팔로워 범위: {min_f:,}~{max_f:,}")
            elif min_f:
                filter_instructions.append(f"- 팔로워: {min_f:,} 이상")
            elif max_f:
                filter_instructions.append(f"- 팔로워: {max_f:,} 이하 (마이크로 인플루언서)")
        if filters.get("content_type"):
            filter_instructions.append(f"- 콘텐츠 유형: {filters['content_type']}")
        if filters.get("age_range"):
            filter_instructions.append(f"- 연령대: {filters['age_range']}")
        if filters.get("location"):
            filter_instructions.append(f"- 지역: {filters['location']}")
        filter_block = "\n".join(filter_instructions) if filter_instructions else "없음"

        prompt = f"""당신은 한국 Instagram 전문가입니다. 사용자 프로필 분석 결과를 보고 실제로 존재하는 한국 Instagram 계정을 추천하세요.

사용자 프로필:
- 관심사: {interests_str}
- 성격 (Big5): {personality_str}
- 최근 캡션: {captions_str}
{f"- 찾는 사람: {looking_for}" if looking_for else ""}

**검색 필터:**
{filter_block}

**중요 규칙:**
1. 반드시 실제로 존재하는(또는 존재할 가능성이 매우 높은) 한국 Instagram 계정을 추천하세요
2. 한국에서 활동하는 마이크로 인플루언서, 크리에이터, 일반 유저 계정을 추천하세요
3. 팔로워 1만~50만 정도의 접근 가능한 계정 위주로 추천하세요
4. 각 관심사별로 가장 관련성 높은 실제 계정을 찾으세요
5. username은 실제 Instagram에서 사용되는 형식이어야 합니다 (실제 존재하는 계정)
6. 검색 필터가 있으면 반드시 준수하세요 (성별, 팔로워 범위, 콘텐츠 유형, 지역)

관심사별 실제 계정 카테고리:
- 카페/커피: 유명 바리스타, 카페 리뷰어, 로스터리 운영자
- 운동/피트니스: 필라테스 강사, 러닝크루 리더, 트레이너
- 전시/아트: 갤러리스트, 아트 크리에이터, 전시 리뷰어
- 독서: 북스타그래머, 독립서점 운영자, 북 크리에이터
- 요리/맛집: 푸드 크리에이터, 셰프, 맛집 리뷰어
- 패션: 스타일리스트, 패션 에디터, 빈티지샵 운영자
- 여행: 여행 크리에이터, 호텔리어, 트래블 에디터
- 음악: 뮤지션, DJ, 음악 평론가

5명의 실제 계정을 JSON 배열로 추천하세요:
{{
  "username": "실제_인스타_아이디",
  "common_interests": ["공통관심사1", "공통관심사2", "고유관심사"],
  "ai_summary": "이 계정에 대한 2-3문장 설명. 실제 활동 내용, 콘텐츠 스타일, 성격 추정 포함.",
  "compatibility_score": 0.75~0.95,
  "is_private": false,
  "recent_posts": ["이 계정이 올릴 법한 실제 캡션 스타일 1", "캡션 2", "캡션 3"],
  "analysis_detail": "왜 이 사용자와 잘 맞는지 1-2문장",
  "estimated_followers": 50000,
  "estimated_gender": "female 또는 male 또는 unknown"
}}

JSON 배열만 출력. [ ... ] 형태로만 응답."""

        response = await asyncio.to_thread(
            client.messages.create,
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        matches = json.loads(raw)

        # 병렬로 사진 스크래핑
        async def _scrape_for_match(match):
            mu = match.get("username", "")
            if mu:
                scraped = await scrape_instagram_photos(mu, max_photos=10)
                if scraped:
                    match["profile_image_urls"] = scraped
                    return
            rng = random.Random(sum(ord(c) for c in (mu or "x")))
            shuffled = UNSPLASH_PROFILE_IMAGES.copy()
            rng.shuffle(shuffled)
            fallback_urls = shuffled[:rng.randint(1, 3)]
            # Unsplash도 로컬 캐시에 저장
            match["profile_image_urls"] = await download_and_cache_photos(mu or "unknown", fallback_urls)

        await asyncio.gather(*[_scrape_for_match(m) for m in matches])

        logger.info(f"AI matches generated for {username}: {len(matches)} profiles")
        return matches

    except Exception as e:
        logger.error(f"AI match generation failed for {username}: {e}")
        # 최후 fallback: mock matches
        if interests:
            return _generate_mock_matches(interests, username)
        return None


def _generate_mock_matches(interests: list, username: str) -> list:
    """Mock 모드용 맞춤 매칭 프로필 생성 (Claude 호출 없이)"""
    seed = sum(ord(c) for c in username)
    rng = random.Random(seed)

    MOCK_PROFILES = [
        {
            "username": "yuna_cafe",
            "common_interests": ["스페셜티커피매니아", "카페투어", "미니멀라이프"],
            "ai_summary": "성수동·연남동 카페를 섭렵한 커피 마니아. 라떼아트 연습 중이며, 조용한 공간에서 책 읽는 시간을 좋아해요. 따뜻하고 차분한 성격.",
            "compatibility_score": 0.93,
            "recent_posts": ["새로 발견한 로스터리, 싱글오리진이 미쳤어요 ☕", "오늘의 라떼아트 연습. 점점 나아지고 있다!", "비 오는 날 카페에서 보내는 오후 🌧"],
            "analysis_detail": "카페·커피 관련 게시물 85%. 감성적이고 차분한 톤.",
        },
        {
            "username": "hyunwoo_run",
            "common_interests": ["러닝크루", "주말등산러", "건강식단"],
            "ai_summary": "한강 러닝크루 운영자. 매주 10km 이상 뛰고, 주말에는 등산도 즐기는 활동파. 에너지 넘치지만 따뜻한 사람.",
            "compatibility_score": 0.88,
            "recent_posts": ["한강 야간러닝 10km 완주! 🏃\u200d♂️", "북한산 정상에서 본 일출 🌅", "운동 후 단백질 보충. 오늘은 치킨 샐러드"],
            "analysis_detail": "운동·아웃도어 콘텐츠 주류. 긍정적 에너지.",
        },
        {
            "username": "minji_art",
            "common_interests": ["전시덕후", "필름사진", "성수팝업"],
            "ai_summary": "전시회와 갤러리를 사랑하는 아트 덕후. 필름 카메라로 일상을 담고, 감성적인 글을 자주 올려요.",
            "compatibility_score": 0.85,
            "recent_posts": ["이번 주 전시 3개째. 예술은 영혼의 양식 🎨", "Portra 800으로 담은 을지로 골목", "연남동 새 갤러리 오픈! 꼭 가보세요"],
            "analysis_detail": "예술·사진 관련 게시물 위주. 시각적 감각 우수.",
        },
        {
            "username": "soojin_book",
            "common_interests": ["독서광", "독립서점탐방", "에세이쓰기"],
            "ai_summary": "한 달에 8권 이상 읽는 독서광. 독립서점 탐방이 취미이고, 직접 에세이도 쓰는 글쟁이. 깊이 있는 대화를 좋아해요.",
            "compatibility_score": 0.82,
            "recent_posts": ["이번 달 독서 기록 📚 한강 '소년이 온다' 정말 좋았다", "망원동 독립서점에서 보낸 오후", "새벽에 쓴 에세이. 글을 쓰면 마음이 정리돼요"],
            "analysis_detail": "텍스트 중심 게시물. 인문학적 깊이.",
        },
        {
            "username": "doyeon_yoga",
            "common_interests": ["요가명상", "비건베이킹", "셀프케어"],
            "ai_summary": "매일 아침 요가로 시작하는 웰니스 러버. 비건 베이킹도 즐기고, 마음 챙김에 진심인 사람이에요.",
            "compatibility_score": 0.79,
            "recent_posts": ["오늘의 아침 요가 루틴 🧘\u200d♀️ 몸과 마음이 깨어나는 느낌", "비건 바나나 브레드 성공! 🍌", "명상 30일 챌린지 완주. 진짜 달라졌어요"],
            "analysis_detail": "웰니스·건강 관련 게시물 70%. 긍정적 톤.",
        },
    ]

    interests_set = set(interests)

    def overlap_score(profile):
        return len(interests_set & set(profile["common_interests"]))

    sorted_profiles = sorted(MOCK_PROFILES, key=overlap_score, reverse=True)

    shuffled_images = UNSPLASH_PROFILE_IMAGES.copy()
    rng.shuffle(shuffled_images)
    for i, profile in enumerate(sorted_profiles):
        num_images = rng.randint(1, 3)
        start = (i * 3) % len(shuffled_images)
        raw_urls = [
            shuffled_images[(start + j) % len(shuffled_images)]
            for j in range(num_images)
        ]
        profile["profile_image_urls"] = raw_urls
        profile["is_private"] = False

    logger.info(f"Mock AI matches generated for {username}: {len(sorted_profiles)} profiles")
    return sorted_profiles


# ---------------------------------------------------------------------------
# 분석 파이프라인
# ---------------------------------------------------------------------------

async def run_analysis_pipeline(username: str, input_type: InputType = InputType.instagram):
    """Browser Use + Tavily + Claude + Mem0 통합 분석 파이프라인"""
    try:
        def update_status(progress: int, step: str, **kwargs):
            analysis_status[username].update({
                "progress": progress,
                "current_step": step,
                **kwargs
            })

        platform_label = {"instagram": "Instagram", "linkedin": "LinkedIn", "email": "이메일"}.get(input_type.value, "")

        # Step 1: Browser Use로 실제 Instagram 프로필 스크래핑 (Instagram인 경우)
        browser_data = None
        if input_type == InputType.instagram:
            update_status(5, "Browser Use로 Instagram 탐색 중...")
            browser_data = await browser_use_scrape_instagram(username)
            if browser_data:
                logger.info(f"Browser Use: got profile data for @{username}: {list(browser_data.keys())}")

        update_status(15, f"{platform_label} 웹 정보 수집 중...")

        # Step 2: Tavily로 추가 공개 정보 수집
        web_context = ""
        tavily_key = os.getenv("TAVILY_API_KEY")
        if tavily_key:
            try:
                from tavily import TavilyClient
                tavily = TavilyClient(api_key=tavily_key)

                if input_type == InputType.instagram:
                    queries = [
                        f"instagram.com/{username} profile",
                        f"@{username} instagram interests hobbies",
                    ]
                elif input_type == InputType.linkedin:
                    url_part = username if "linkedin.com" in username else f"linkedin.com/in/{username}"
                    queries = [f"{url_part} profile skills"]
                else:
                    queries = [f'"{username}" social media profile interests']

                snippets = []
                for q in queries:
                    try:
                        result = tavily.search(query=q, search_depth="basic", max_results=3)
                        for r in result.get("results", []):
                            snippets.append(f"[{r.get('title', '')}] {r.get('snippet', '')}")
                    except Exception as e:
                        logger.warning(f"Tavily search failed for '{q}': {e}")

                web_context = "\n".join(snippets[:8])
                logger.info(f"Tavily collected {len(snippets)} snippets for {username}")
            except Exception as e:
                logger.warning(f"Tavily collection failed: {e}")

        update_status(35, "AI 프로필 분석 중...")

        # Step 3: 수집된 데이터 통합 → Claude로 디지털 트윈 생성
        from anthropic import Anthropic
        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        input_label = {
            "instagram": f"Instagram @{username}",
            "linkedin": f"LinkedIn {username}",
            "email": f"이메일 {username}",
        }.get(input_type.value, username)

        # Browser Use에서 수집된 실제 데이터 포맷팅
        browser_context = ""
        if browser_data:
            parts = []
            if browser_data.get("bio"):
                parts.append(f"바이오: {browser_data['bio']}")
            if browser_data.get("captions"):
                caps = browser_data["captions"]
                if isinstance(caps, list):
                    parts.append(f"최근 게시물 캡션:\n" + "\n".join(f"- {c}" for c in caps[:6]))
            if browser_data.get("hashtags"):
                tags = browser_data["hashtags"]
                if isinstance(tags, list):
                    parts.append(f"해시태그: {', '.join(tags[:20])}")
            if browser_data.get("followers"):
                parts.append(f"팔로워: {browser_data['followers']}")
            if parts:
                browser_context = "Browser Use로 수집한 실제 프로필 데이터:\n" + "\n".join(parts)

        all_context = "\n\n".join(c for c in [browser_context, f"웹 검색 결과:\n{web_context}" if web_context else ""] if c)

        prompt = f"""다음 사용자의 디지털 트윈 프로필을 생성하세요.

사용자: {input_label}
플랫폼: {platform_label}

{all_context if all_context else "웹 정보를 찾지 못했습니다. 사용자 이름과 플랫폼 특성을 기반으로 합리적인 프로필을 생성하세요."}

아래 JSON 형식으로 정확히 반환하세요. 다른 텍스트 없이 JSON만 출력:
{{
  "interests": ["관심사1", "관심사2", "관심사3", "관심사4", "관심사5"],
  "lifestyle": {{
    "활동성": "높음/중상/중/중하/낮음",
    "사교성": "높음/중상/중/중하/낮음",
    "창의성": "높음/중상/중/중하/낮음"
  }},
  "personality_big5": {{
    "openness": 0.0~1.0,
    "conscientiousness": 0.0~1.0,
    "extraversion": 0.0~1.0,
    "agreeableness": 0.0~1.0,
    "neuroticism": 0.0~1.0
  }},
  "communication_style": "casual 또는 formal 또는 creative",
  "summary": "이 사용자에 대한 2-3문장 요약",
  "captions": ["이 사용자가 쓸 법한 SNS 캡션 1", "캡션 2", "캡션 3"]
}}

관심사는 한국 SNS 트렌드에 맞는 해시태그 스타일로 작성하세요 (예: 스페셜티커피매니아, 주말등산러, 전시덕후).
Big5 성격 점수는 소수점으로 0.0~1.0 사이로 작성하세요.
{f"수집된 실제 데이터를 최대한 반영하여 정확한 프로필을 만드세요." if all_context else "사용자명의 느낌과 플랫폼 특성을 기반으로 창의적이지만 현실적인 프로필을 만드세요."}"""

        update_status(55, "관심사 태그 추출 중...")

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        profile = json.loads(raw)

        update_status(85, "디지털 트윈 완성 중...")

        # Step 4: Mem0에 프로필 저장
        final_result = {
            "interests": profile.get("interests", []),
            "lifestyle": profile.get("lifestyle", {}),
            "personality_big5": profile.get("personality_big5", {}),
            "communication_style": profile.get("communication_style", "casual"),
            "summary": profile.get("summary", ""),
        }
        await mem0_store_profile(username, final_result)

        update_status(95, "프로필 저장 완료!")
        await asyncio.sleep(0.3)

        # Browser Use에서 수집한 실제 캡션 우선 사용
        captions = profile.get("captions", [])
        if browser_data and browser_data.get("captions") and isinstance(browser_data["captions"], list):
            captions = browser_data["captions"][:5]

        analysis_status[username].update({
            "status": "completed",
            "progress": 100,
            "current_step": "분석 완료!",
            "result": final_result,
            "captions": captions,
            "browser_use_data": bool(browser_data),
        })
        logger.info(f"Analysis completed for {username} (browser_use={bool(browser_data)}, mem0={bool(_mem0_client)}): {profile.get('interests', [])}")

    except Exception as e:
        logger.error(f"Analysis pipeline failed for {username}: {e}")
        logger.info(f"Falling back to mock analysis for {username}")
        await run_mock_analysis_pipeline(username, input_type)


# 사용자명 기반 시드로 일관된 mock 관심사 생성
MOCK_INTEREST_POOLS = [
    ["스페셜티커피매니아", "미니멀라이프", "독서모임", "카페투어"],
    ["주말등산러", "필름사진", "러닝크루", "아웃도어"],
    ["전시덕후", "성수팝업", "브런치탐방", "빈티지쇼핑"],
    ["필라테스러버", "건강식단", "요가명상", "셀프케어"],
    ["독서광", "독립서점탐방", "에세이쓰기", "철학에세이"],
    ["맛집탐방", "와인초보", "홈쿠킹", "베이킹"],
]


async def run_mock_analysis_pipeline(username: str, input_type: InputType = InputType.instagram):
    """Mock 분석 파이프라인 — API 키 없을 때 데모용"""
    try:
        def update_status(progress: int, step: str, **kwargs):
            analysis_status[username].update({
                "progress": progress,
                "current_step": step,
                **kwargs
            })

        seed = sum(ord(c) for c in username) % len(MOCK_INTEREST_POOLS)

        platform_label = {"instagram": "Instagram", "linkedin": "LinkedIn", "email": "이메일"}.get(input_type.value, "")

        update_status(10, f"{platform_label} 프로필 탐색 중...")
        await asyncio.sleep(1.5)

        update_status(35, "게시물 수집 완료. AI 이미지 분석 중...")
        await asyncio.sleep(2.0)

        update_status(70, "관심사 태그 추출 중...")
        await asyncio.sleep(1.5)

        update_status(90, "프로필 완성 중...")
        await asyncio.sleep(1.0)

        mock_interests = MOCK_INTEREST_POOLS[seed][:3]

        analysis_status[username].update({
            "status": "completed",
            "progress": 100,
            "current_step": "분석 완료!",
            "result": {
                "interests": mock_interests,
                "lifestyle": {"활동성": "중상", "사교성": "중"},
                "personality_big5": {
                    "openness": 0.78,
                    "conscientiousness": 0.65,
                    "extraversion": 0.52,
                    "agreeableness": 0.71,
                    "neuroticism": 0.35
                },
                "communication_style": "casual"
            },
            "captions": [
                "오늘도 좋아하는 카페에서 ☕",
                "주말 산책 기록. 요즘 이 길이 좋아",
                "드디어 읽기 시작! 기대된다"
            ]
        })
        logger.info(f"Mock analysis completed for {username}")

    except Exception as e:
        logger.error(f"Mock analysis failed for {username}: {e}")
        analysis_status[username].update({
            "status": "failed",
            "progress": 0,
            "current_step": f"분석 실패: {str(e)}"
        })
