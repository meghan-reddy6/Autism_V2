import pytest
import time
import httpx
from src.controllers.patients.cdss_ml_client import fetch_ml_metadata, cb, CircuitBreaker

@pytest.mark.asyncio
async def test_circuit_breaker_fallback_and_recovery(monkeypatch):
    # Reset CB
    cb.state = "CLOSED"
    cb.failure_count = 0
    cb.recovery_timeout = 0.1 # short timeout for testing
    
    payload = {
        "scale_type": "M-CHAT-R",
        "normalized_score": 5,
        "age_months": 24,
        "features": {}
    }
    
    # Mock httpx.AsyncClient.post to raise ConnectError
    async def mock_post(*args, **kwargs):
        raise httpx.ConnectError("Connection refused")
        
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)
    
    # Fail 3 times
    for _ in range(3):
        res = await fetch_ml_metadata(payload)
        assert res["status"] == "fallback"
        assert res["risk_level"] == "Medium / Moderate Risk" # Fallback logic for score 5
        
    assert cb.state == "OPEN"
    
    # 4th request while OPEN should return fallback immediately
    res = await fetch_ml_metadata(payload)
    assert res["status"] == "fallback"
    
    # Wait for recovery timeout
    time.sleep(0.2)
    
    # Next request should be HALF_OPEN, but mock still fails, so it goes back to OPEN
    res = await fetch_ml_metadata(payload)
    assert res["status"] == "fallback"
    assert cb.state == "OPEN"
    
    # Mock successful response
    class MockResponse:
        status_code = 200
        def json(self):
            return {"status": "success", "risk_level": "High", "confidence_score": 0.9, "shap_breakdown": {}}
            
    async def mock_post_success(*args, **kwargs):
        return MockResponse()
        
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post_success)
    
    # Wait for recovery timeout again
    time.sleep(0.2)
    
    # Next request should succeed and CLOSE the breaker
    res = await fetch_ml_metadata(payload)
    assert res["status"] == "success"
    assert cb.state == "CLOSED"
    assert cb.failure_count == 0
