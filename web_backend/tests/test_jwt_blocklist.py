import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
import uuid
from main import app
from dependencies import create_access_token

@pytest.mark.asyncio
async def test_jwt_blocklist_enforcement():
    client = TestClient(app)
    
    # Generate token
    token = create_access_token(data={"sub": "123", "tenantId": "t1", "role": "ASSESSOR"})
    
    # Since auth requires DB, and this test might run without DB setup, 
    # we just need to ensure the blocklist is checked. 
    # But wait, `get_current_user` calls `user_repo.find_unique`.
    # Let's mock `user_repo.find_unique`
    from unittest.mock import patch, AsyncMock, MagicMock
    
    mock_user = type("obj", (object,), {
        "id": "123", 
        "tenantId": "t1", 
        "role": "ASSESSOR", 
        "isActive": True,
        "email": "test@test.com",
        "firstName": "John",
        "lastName": "Doe"
    })()
    mock_user_actions = MagicMock()
    mock_user_actions.find_unique = AsyncMock(return_value=mock_user)
    
    with patch("infrastructure.tenantAwareRepository.user_repo.find_unique", new_callable=AsyncMock) as mock_find_unique:
        mock_find_unique.return_value = mock_user
        with patch("fastapi_cache.FastAPICache.get_backend", new_callable=MagicMock) as mock_get_backend:
            mock_backend = AsyncMock()
            mock_redis = AsyncMock()
            mock_backend.redis = mock_redis
            mock_get_backend.return_value = mock_backend
            mock_redis.get.return_value = None # Not blocklisted initially
            
            # 1. Normal access (Not blocklisted)
            response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert response.status_code == 200
            
            # 2. Blocklist the token
            import jwt
            from dependencies import SECRET_KEY, ALGORITHM
            
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            jti = payload.get("jti")
            
            # Simulate blocklist
            mock_redis.get.return_value = "true"
            
            # 3. Blocklisted access
            response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert response.status_code == 401
