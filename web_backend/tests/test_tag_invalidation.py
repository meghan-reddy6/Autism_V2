import pytest
from unittest.mock import AsyncMock, patch
from src.infrastructure.cache.redis_cache_manager import cache_service

@pytest.mark.asyncio
async def test_tag_invalidation():
    # We will mock FastAPICache backend and redis
    from fastapi_cache import FastAPICache
    from unittest.mock import MagicMock
    
    mock_backend = MagicMock()
    mock_redis = AsyncMock()
    mock_backend.redis = mock_redis
    FastAPICache.init(mock_backend)
    
    # Setup mock smembers to return some keys
    mock_redis.smembers = AsyncMock(return_value=["key1", "key2"])
    mock_redis.unlink = AsyncMock()
    
    # Run invalidate
    await cache_service.invalidate_tags("tenant_123", ["dashboard"])
    
    # Assert smembers was called to get keys for the tag
    mock_redis.smembers.assert_called_with("cache_tag:tenant_123:dashboard")
    
    # Assert unlink was called to delete the keys
    mock_redis.unlink.assert_any_call("key1", "key2")
    
    # Assert unlink was called to delete the tag index itself
    mock_redis.unlink.assert_any_call("cache_tag:tenant_123:dashboard")
