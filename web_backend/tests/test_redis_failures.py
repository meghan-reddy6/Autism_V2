import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.infrastructure.cache.redis_cache_manager import CacheService, coalesce
from src.infrastructure.config.cache_config import CacheConsistencyLevel
from fastapi_cache import FastAPICache
import json

@pytest.fixture
def mock_cache_backend():
    mock_backend = MagicMock()
    mock_redis = AsyncMock()
    mock_backend.redis = mock_redis
    FastAPICache.init(mock_backend)
    yield mock_backend
    FastAPICache.reset()

@pytest.mark.asyncio
async def test_cache_hit(mock_cache_backend):
    mock_cache_backend.get = AsyncMock(return_value='{"data": "test"}')
    result = await CacheService.get("key1")
    assert result == {"data": "test"}
    mock_cache_backend.get.assert_called_once_with("key1")

@pytest.mark.asyncio
async def test_cache_miss(mock_cache_backend):
    mock_cache_backend.get = AsyncMock(return_value=None)
    result = await CacheService.get("key1")
    assert result is None

@pytest.mark.asyncio
async def test_cache_set(mock_cache_backend):
    mock_cache_backend.set = AsyncMock()
    await CacheService.set("key1", {"data": "test"}, expire=60, tags=["tag1"], tenant_id="t1")
    mock_cache_backend.set.assert_called_once_with("key1", '{"data": "test"}', expire=60)
    mock_cache_backend.redis.sadd.assert_called_once_with("cache_tag:t1:tag1", "key1")
    mock_cache_backend.redis.expire.assert_called_once_with("cache_tag:t1:tag1", 60)

@pytest.mark.asyncio
async def test_invalidate_tags(mock_cache_backend):
    mock_cache_backend.redis.smembers = AsyncMock(return_value=["key1", "key2"])
    mock_cache_backend.redis.unlink = AsyncMock()
    
    await CacheService.invalidate_tags("t1", ["tag1"])
    mock_cache_backend.redis.smembers.assert_called_once_with("cache_tag:t1:tag1")
    assert mock_cache_backend.redis.unlink.call_count == 2 # Keys and the tag

@pytest.mark.asyncio
async def test_redis_unavailable_fallback():
    # FastAPICache not initialized or backend is None
    FastAPICache.reset()
    
    @coalesce(lambda x: "key1")
    async def dummy_func(x):
        return {"result": x}
        
    res = await dummy_func("test")
    assert res == {"result": "test"}
    
@pytest.mark.asyncio
async def test_coalesce_strong_consistency(mock_cache_backend):
    @coalesce(lambda x: "key1", consistency=CacheConsistencyLevel.STRONG)
    async def dummy_func(x):
        return {"result": x}
        
    res = await dummy_func("test")
    assert res == {"result": "test"}
    # Cache should be bypassed entirely
    mock_cache_backend.get.assert_not_called()
