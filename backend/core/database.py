import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_client = None
_db = None


def get_database():
    global _client, _db
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        logger.warning("MONGODB_URI not set, database unavailable")
        return None
    if _db is None:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            _client = AsyncIOMotorClient(mongodb_uri)
            _db = _client.soulmatch
        except ImportError:
            logger.warning("motor not installed, database unavailable")
            return None
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            return None
    return _db


db = get_database()
