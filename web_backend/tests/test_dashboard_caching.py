import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app
from services.cache_service import cache_service

@pytest.fixture
def mock_dashboard_db():
    with patch('services.dashboard_service.db') as mock_db:
        mock_db.patient.count = AsyncMock(return_value=10)
        mock_db.assessment.count = AsyncMock(side_effect=[5, 2]) # 5 pending, 2 alerts
        mock_db.appointment.count = AsyncMock(return_value=2)
        mock_db.assessment.find_many = AsyncMock(return_value=[])
        yield mock_db

@pytest.fixture
def mock_cache_service():
    # We will mock the cache_service methods to simulate a hit/miss
    with patch('services.cache_service.cache_service.get', new_callable=AsyncMock) as mock_get:
        with patch('services.cache_service.cache_service.set', new_callable=AsyncMock) as mock_set:
            mock_get.return_value = None  # Force a cache miss initially
            yield mock_get, mock_set

def override_get_current_user():
    class MockUser:
        tenantId = "tenant-test"
        role = "SUPER_ADMIN"
    return MockUser()

def test_dashboard_stats_caching(mock_dashboard_db, mock_cache_service):
    from dependencies import get_current_user
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    client = TestClient(app)
    mock_get, mock_set = mock_cache_service
    
    try:
        # First call: Cache miss, should hit DB and then set cache
        response = client.get("/api/v1/dashboard/stats")
        assert response.status_code == 200
        assert mock_get.called
        assert mock_set.called
        assert mock_dashboard_db.patient.count.called
        
        # Now simulate a cache hit by updating the mock_get return value
        mock_get.return_value = response.json()
        mock_dashboard_db.patient.count.reset_mock()
        mock_set.reset_mock()
        
        # Second call: Cache hit, should NOT hit DB
        response2 = client.get("/api/v1/dashboard/stats")
        assert response2.status_code == 200
        assert not mock_dashboard_db.patient.count.called
        assert not mock_set.called
        
    finally:
        app.dependency_overrides.clear()
