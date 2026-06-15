import pytest
import asyncio
from unittest.mock import AsyncMock
from infrastructure.redisCacheManager import coalesce

@pytest.mark.asyncio
async def test_cache_stampede_protection():
    # We will simulate a function that takes time to execute (e.g. DB fetch)
    db_fetch_count = 0
    
    # We must patch cache_service methods to simulate cache missing and locks
    from infrastructure.redisCacheManager import cache_service
    import infrastructure.redisCacheManager as cs_module
    from fastapi_cache import FastAPICache
    from unittest.mock import MagicMock
    
    # Mock backend
    mock_backend = MagicMock()
    mock_redis = MagicMock()
    mock_backend.redis = mock_redis
    FastAPICache.init(mock_backend)
    
    # Mock lock
    locks = {}
    class MockLock:
        def __init__(self, key, *args, **kwargs):
            self.key = key
            self._locked = False
        async def acquire(self, blocking_timeout=5, *args, **kwargs):
            start = asyncio.get_event_loop().time()
            while self._locked:
                if asyncio.get_event_loop().time() - start > blocking_timeout:
                    return False
                await asyncio.sleep(0.01)
            self._locked = True
            return True
        async def release(self):
            self._locked = False
        async def owned(self):
            return self._locked

    def get_lock(key, **kwargs):
        if key not in locks:
            locks[key] = MockLock(key)
        return locks[key]

    mock_redis.lock.side_effect = get_lock
    
    # Mock cache get/set
    cache_store = {}
    async def mock_get(key):
        return cache_store.get(key)
    async def mock_set(key, val, **kwargs):
        cache_store[key] = val
        await cache_service.set("coalesce:test_key", {"data": "cached_db_data"}, expire=60)
    cached = await cache_service.get("coalesce:test_key")
        
    cache_service.get = AsyncMock(side_effect=mock_get)
    cache_service.set = AsyncMock(side_effect=mock_set)

    def my_key_builder(id):
        return f"test_key:{id}"

    @coalesce(key_builder=my_key_builder)
    async def fetch_data(id: str):
        nonlocal db_fetch_count
        db_fetch_count += 1
        await asyncio.sleep(0.1) # simulate DB time
        return f"data_{id}"
        
    # Launch concurrent requests
    tasks = [fetch_data("123") for _ in range(5)]
    results = await asyncio.gather(*tasks)
    
    # All should return the correct data
    assert all(r == "data_123" for r in results)
    
    # The DB fetch should only happen ONCE despite 5 concurrent requests
    assert db_fetch_count == 1
