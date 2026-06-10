import logging
import json
from typing import Optional, List
from fastapi_cache import FastAPICache

logger = logging.getLogger("cache_telemetry")

class CacheMetricsLogger:
    def _log(self, event: str, **kwargs):
        log_data = {"event": event}
        log_data.update(kwargs)
        logger.info(json.dumps(log_data))

    def log_hit(self, key: str, tags: Optional[List[str]] = None, domain: str = "unknown", tenant_id: str = "unknown"):
        self._log("CACHE_HIT", key=key, tenant_id=tenant_id, tags=tags or [], domain=domain)

    def log_miss(self, key: str, tags: Optional[List[str]] = None, domain: str = "unknown", tenant_id: str = "unknown"):
        self._log("CACHE_MISS", key=key, tenant_id=tenant_id, tags=tags or [], domain=domain)

    def log_invalidation(self, tags: List[str], tenant_id: str = "unknown", keys_cleared: int = 0):
        self._log("CACHE_INVALIDATION", tags=tags, tenant_id=tenant_id, keys_cleared=keys_cleared)

    def log_stampede_protection(self, key: str):
        self._log("CACHE_STAMPEDE_PROTECTED", key=key, message="Concurrent request coalesced via lock.")

    def log_drift_detected(self, key: str, expected_state: str, actual_state: str):
        self._log("CACHE_DRIFT_DETECTED", key=key, expected=expected_state, actual=actual_state)

    def log_stale_read(self, key: str, age_ms: int, max_age_ms: int):
        self._log("CACHE_STALE_READ", key=key, age_ms=age_ms, max_age_ms=max_age_ms)

    def log_event_drop(self, stream: str, message_id: str, error: str):
        self._log("EVENT_DROP", stream=stream, message_id=message_id, error=error)

    async def log_memory_pressure(self):
        backend = FastAPICache.get_backend()
        if not backend:
            return
        
        try:
            if hasattr(backend, "redis"):
                info = await backend.redis.info(section="memory")
                logger.info(json.dumps({
                    "event": "REDIS_MEMORY_PRESSURE",
                    "used_memory_human": info.get("used_memory_human", "unknown"),
                    "used_memory_peak_human": info.get("used_memory_peak_human", "unknown")
                }))
        except Exception as e:
            logger.warning(f"Could not fetch Redis memory info: {e}")

cache_metrics = CacheMetricsLogger()

async def log_event_drop(redis, stream: str, message_id: str, error: str):
    cache_metrics.log_event_drop(stream, message_id, error)
