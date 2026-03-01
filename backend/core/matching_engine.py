import logging
import os
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class MatchingEngine:
    def __init__(self):
        pass

    def calculate_interest_overlap(self, user_interests: list, candidate_interests: list) -> float:
        """공통 관심사 직접 계산 — 키워드 부분 매칭 포함"""
        if not user_interests or not candidate_interests:
            return 0.0

        overlap_count = 0
        for u_interest in user_interests:
            u_lower = u_interest.lower()
            for c_interest in candidate_interests:
                c_lower = c_interest.lower()
                if u_lower == c_lower or u_lower in c_lower or c_lower in u_lower:
                    overlap_count += 1
                    break

        max_possible = min(len(user_interests), len(candidate_interests))
        return overlap_count / max_possible if max_possible > 0 else 0.0

    def normalize_score(self, raw_score: float, min_out: float = 0.75, max_out: float = 0.98) -> float:
        """매칭 점수를 0.75~0.98 범위로 정규화"""
        clamped = max(0.0, min(1.0, raw_score))
        return min_out + clamped * (max_out - min_out)

    async def calculate_compatibility(self, user_profile: dict, candidate_profile: dict) -> float:
        """관심사 기반 매칭 점수"""
        interest_score = self.calculate_interest_overlap(
            user_profile.get("interests", []),
            candidate_profile.get("interests", [])
        )
        raw_score = interest_score * 0.7 + 0.3
        return self.normalize_score(raw_score)

    async def get_top_matches(self, user_profile: dict, candidate_profiles: list, top_k: int = 10) -> list:
        scored = []
        for candidate in candidate_profiles:
            score = await self.calculate_compatibility(user_profile, candidate)
            scored.append({**candidate, "compatibility_score": score})

        return sorted(scored, key=lambda x: x["compatibility_score"], reverse=True)[:top_k]
