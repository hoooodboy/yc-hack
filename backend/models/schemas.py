from enum import Enum
from typing import Optional
from pydantic import BaseModel


class InputType(str, Enum):
    instagram = "instagram"
    linkedin = "linkedin"
    email = "email"


class ProfileData(BaseModel):
    username: str
    bio: str
    image_urls: list[str]
    captions: list[str]
    hashtags: list[str]
    post_frequency: int
    is_private: bool


class AnalysisResult(BaseModel):
    interests: list[str]
    lifestyle: dict
    personality_big5: dict
    communication_style: str


class MatchCard(BaseModel):
    username: str
    profile_image_urls: list[str]
    common_interests: list[str]
    ai_summary: str
    compatibility_score: float
    is_private: bool = False


class MessageRequest(BaseModel):
    sender_username: str
    target_username: str
    common_interests: list[str]


class MessageResponse(BaseModel):
    messages: list[str]
    target_username: str


class AnalyzeProfileRequest(BaseModel):
    # 새 필드: multi-platform 지원
    input_type: InputType = InputType.instagram
    input_value: Optional[str] = None
    # 하위 호환: 기존 frontend가 username만 보내는 경우
    username: Optional[str] = None


class AnalysisStatusResponse(BaseModel):
    username: str
    status: str
    progress: int
    current_step: str
    result: Optional[AnalysisResult] = None


class OpenDMRequest(BaseModel):
    target_username: str
    message: str


class OpenDMResponse(BaseModel):
    success: bool
    message: str
