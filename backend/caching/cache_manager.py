"""Phase 9: Caching Layer (Section 14 of research notes).

Attempts to use Redis for production speed. 
Falls back to a local in-memory cache (cachetools) for hackathon/local demos
if a Redis server is not running. This guarantees speed without setup headaches.
"""

import json
import hashlib
import logging
import config

log = logging.getLogger(__name__)

_redis_client = None
_memory_cache = None

def _get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.Redis(host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True)
            _redis_client.ping() # Test connection
            log.info("✅ Connected to Redis cache.")
        except Exception as e:
            log.warning("⚠️ Redis not available. Falling back to in-memory cache for demo.")
            _redis_client = False # Mark as failed so we don't keep trying
    return _redis_client

def _get_memory_cache():
    global _memory_cache
    if _memory_cache is None:
        from cachetools import TTLCache
        # Max 1000 items, expires in CACHE_TTL_SECONDS
        _memory_cache = TTLCache(maxsize=1000, ttl=config.CACHE_TTL_SECONDS)
    return _memory_cache

def get_cache_key(query: str) -> str:
    """Create a unique, normalized hash for the question."""
    clean_query = query.strip().lower()
    return f"adtu_rag:{hashlib.md5(clean_query.encode()).hexdigest()}"

def get_cached_response(query: str) -> dict | None:
    """Retrieve a cached response if it exists."""
    if not config.CACHE_ENABLED:
        return None
        
    key = get_cache_key(query)
    
    # Try Redis first
    r = _get_redis()
    if r:
        try:
            data = r.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
            
    # Fallback to memory
    return _get_memory_cache().get(key)

def save_to_cache(query: str, response_data: dict):
    """Save the final pipeline result to the cache."""
    if not config.CACHE_ENABLED:
        return
        
    key = get_cache_key(query)
    serialized = json.dumps(response_data)
    
    # Try Redis first
    r = _get_redis()
    if r:
        try:
            r.setex(key, config.CACHE_TTL_SECONDS, serialized)
            return
        except Exception:
            pass
            
    # Fallback to memory
    _get_memory_cache()[key] = response_data