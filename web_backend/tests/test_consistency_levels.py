import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from src.infrastructure.cache.redis_cache_manager import coalesce
from src.infrastructure.config.cache_config import CacheConsistencyLevel

@pytest.mark.asyncio
async def test_strong_consistency_bypass():
    mock_func = AsyncMock(return_value={"data": "real_db_data"})
    
    @coalesce(key_builder=lambda: "test_key", consistency=CacheConsistencyLevel.STRONG)
    async def fetch_data():
        return await mock_func()
        
    with patch("src.services.redis_cache_manager.cache_service.get", new_callable=AsyncMock) as mock_get:
        result = await fetch_data()
        
        assert result == {"data": "real_db_data"}
        # Cache should NEVER be checked or set for STRONG consistency
        mock_get.assert_not_called()
        mock_func.assert_called_once()

@pytest.mark.asyncio
async def test_eventual_consistency_caching():
    mock_func = AsyncMock(return_value={"data": "real_db_data"})
    
    @coalesce(key_builder=lambda: "test_key", consistency=CacheConsistencyLevel.EVENTUAL)
    async def fetch_data():
        return await mock_func()
        
    with patch("src.services.redis_cache_manager.cache_service.get", new_callable=AsyncMock) as mock_get:
        with patch("src.services.redis_cache_manager.cache_service.set", new_callable=AsyncMock) as mock_set:
            with patch("src.services.redis_cache_manager.FastAPICache.get_backend", new_callable=AsyncMock) as mock_backend:
                mock_get.return_value = None
                mock_backend.return_value = None  # Force fallback behavior for simple test
                
                result = await fetch_data()
                
                assert result == {"data": "real_db_data"}
                mock_get.assert_called_once_with("test_key")
                mock_func.assert_called_once()
                mock_set.assert_called_once()
