import json
import asyncio
from typing import Any, Optional, Union, List, Callable
from functools import wraps
from fastapi_cache import FastAPICache
from logic.cache_telemetry import cache_metrics
from infrastructure.cache_config import CacheConsistencyLevel
import logging

logger = logging.getLogger("cache_service")

class CacheService:
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        backend = FastAPICache.get_backend()
        if not backend:
            return None
            
        # Optional: track memory pressure occasionally
        # await cache_metrics.log_memory_pressure()
        
        cached = await backend.get(key)
        if cached:
            cache_metrics.log_hit(key=key)
            try:
                return json.loads(cached)
            except Exception:
                return cached
                
        cache_metrics.log_miss(key=key)
        return None

    @staticmethod
    async def set(key: str, value: Any, expire: int = 60, tags: Optional[List[str]] = None, tenant_id: str = "unknown") -> None:
        backend = FastAPICache.get_backend()
        if not backend:
            return
        
        if isinstance(value, (dict, list)):
            val_str = json.dumps(value)
        else:
            val_str = str(value)
            
        await backend.set(key, val_str, expire=expire)
        
        # Tag tracking logic (Redis Sets)
        if tags and hasattr(backend, "redis"):
            for tag in tags:
                tag_key = f"cache_tag:{tenant_id}:{tag}"
                await backend.redis.sadd(tag_key, key)
                await backend.redis.expire(tag_key, expire)

    @staticmethod
    async def invalidate_tags(tenant_id: str, tags: List[str]) -> None:
        backend = FastAPICache.get_backend()
        if not backend or not hasattr(backend, "redis"):
            return
            
        keys_cleared = 0
        for tag in tags:
            tag_key = f"cache_tag:{tenant_id}:{tag}"
            members = await backend.redis.smembers(tag_key)
            if members:
                # Unlink the actual keys
                await backend.redis.unlink(*members)
                keys_cleared += len(members)
            # Unlink the tag index itself
            await backend.redis.unlink(tag_key)
            
        cache_metrics.log_invalidation(tags=tags, tenant_id=tenant_id, keys_cleared=keys_cleared)

cache_service = CacheService()

def coalesce(key_builder: Callable[..., str], tags: List[str] = None, ttl: int = 60, consistency: CacheConsistencyLevel = CacheConsistencyLevel.EVENTUAL):
    """
    Decorator enforcing single-flight caching via Redis SETNX distributed lock.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if consistency == CacheConsistencyLevel.STRONG:
                logger.warning(f"Bypassing cache for STRONG consistency endpoint: {func.__name__}")
                return await func(*args, **kwargs)

            key = key_builder(*args, **kwargs)
            tenant_id = kwargs.get("tenant_id", "unknown")
            
            # 1. Double-checked locking - Check cache first
            cached = await cache_service.get(key)
            if cached is not None:
                # Basic stale read check logic
                if isinstance(cached, dict) and "_timestamp" in cached:
                    import time
                    age_ms = (time.time() - cached["_timestamp"]) * 1000
                    if age_ms > (ttl * 1000 * 0.8): # Warn if it's 80% stale
                        cache_metrics.log_stale_read(key, age_ms, ttl * 1000)
                return cached
                
            backend = FastAPICache.get_backend()
            if not backend or not hasattr(backend, "redis"):
                # Fallback if redis is unavailable
                res = await func(*args, **kwargs)
                await cache_service.set(key, res, expire=ttl, tags=tags, tenant_id=tenant_id)
                return res

            # 2. Acquire Redis lock for this key (Stampede protection)
            lock_key = f"lock:{key}"
            lock = backend.redis.lock(lock_key, timeout=10)
            
            try:
                # blocking_timeout limits how long we wait if another worker holds the lock
                acquired = await lock.acquire(blocking_timeout=5)
                if not acquired:
                    # If we couldn't get the lock in time, just read from DB to avoid failing
                    return await func(*args, **kwargs)
                
                # 3. Double-checked locking - Check again after acquiring lock
                cached = await cache_service.get(key)
                if cached is not None:
                    cache_metrics.log_stampede_protection(key=key)
                    return cached
                    
                # 4. Fetch from DB
                res = await func(*args, **kwargs)
                
                # Append metadata for stale read detection
                if isinstance(res, dict):
                    import time
                    res["_timestamp"] = time.time()
                
                # 5. Set Cache
                await cache_service.set(key, res, expire=ttl, tags=tags, tenant_id=tenant_id)
                return res
            finally:
                if await lock.owned():
                    await lock.release()
                    
        return wrapper
    return decorator
