import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timezone, timedelta

@pytest.mark.asyncio
async def test_account_lockout():
    client = TestClient(app)
    
    mock_user = type("obj", (object,), {
        "id": "123", 
        "failedLoginAttempts": 5, 
        "lockedUntil": datetime.now(timezone.utc) + timedelta(minutes=10),
        "isActive": True
    })()
    
    mock_user_actions = MagicMock()
    mock_user_actions.find_unique = AsyncMock(return_value=mock_user)
    
    with patch("routers.auth.db.user", new=mock_user_actions):
        response = client.post("/api/v1/auth/login", data={"username": "test@test.com", "password": "password"})
        
        # Should be forbidden because account is locked
        assert response.status_code == 403
        assert "Account locked" in response.json()["detail"]
