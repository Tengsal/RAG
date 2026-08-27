"""Phase 9: Caching Layer (Section 14 of research notes).

Attempts to use Redis for production speed. 
Falls back to a local in-memory cache (cachetools) for hackathon/local demos
if a Redis server is not running. This guarantees speed without setup headaches.
"""

import json
import hashlib
import logging
import socket
import config

log = logging.getLogger(__name__)

_redis_client = None
_memory_cache = None

def _redis_reachable() -> bool:
    """Fast TCP pre-flight so a dead Redis never blocks a request.

    redis-py's own connect timeout did not reliably cap the OS-level SYN
    timeout on this dev machine (measured ~26 s). A raw socket with an
    explicit timeout fails in ~1-2 s. localhost may resolve to several
    addresses, so worst case ≈ timeout * number of addresses.
    """
    try:
        with socket.create_connection(
            (config.REDIS_HOST, config.REDIS_PORT),
            timeout=config.REDIS_CONNECT_TIMEOUT,
        ):
            return True
    except OSError:
        return False

def warmup():
    """Resolve Redis reachability ONCE at startup instead of inside the first
    request. When Redis is down, the raw-socket pre-flight costs ~1-2 s; if it
    runs inside the request, the first caller pays it. After warmup, every
    request takes the instant in-memory path.
    """
    _get_redis()


def _get_redis():
    global _redis_client
    if _redis_client is None:
        # Pre-flight the TCP connect ourselves; skip redis-py entirely when
        # nothing is listening, and fall back to the in-memory cache now.
        if not _redis_reachable():
            log.warning("⚠️ Redis not reachable at %s:%s. Falling back to in-memory cache.",
                        config.REDIS_HOST, config.REDIS_PORT)
            _redis_client = False # Mark as failed so we don't keep trying
            return False
        try:
            import redis
            _redis_client = redis.Redis(
                host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True,
                socket_connect_timeout=config.REDIS_CONNECT_TIMEOUT,
                socket_timeout=config.REDIS_SOCKET_TIMEOUT,
            )
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
    clean_query = config.normalize_query(query)
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
                log.info("cache HIT (redis): %r", query)
                return json.loads(data)
        except Exception:
            pass

    # Fallback to memory
    hit = _get_memory_cache().get(key)
    if hit is not None:
        log.info("cache HIT (memory): %r", query)
    else:
        log.info("cache MISS: %r", query)
    return hit

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