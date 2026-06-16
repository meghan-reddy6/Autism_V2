import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from src.main import app
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_session_hijacking_prevention():
    client = TestClient(app)
    
    mock_session = type("obj", (object,), {
        "id": "s1",
        "userId": "u1",
        "refreshToken": "ref_token",
        "ipAddress": "192.168.1.100", # Original IP
        "userAgent": "Mozilla/5.0",
        "isRevoked": False,
        "expiresAt": None,
        "user": type("u", (object,), {"isActive": True})()
    })()
    
    mock_usersession_actions = MagicMock()
    mock_usersession_actions.find_unique = AsyncMock(return_value=mock_session)
    mock_usersession_actions.update = AsyncMock()
    
    with patch("src.controllers.auth.db.usersession", new=mock_usersession_actions):
        # Different IP Address
        response = client.post(
            "/api/v1/auth/refresh", 
            json={"refresh_token": "ref_token"},
            headers={"x-forwarded-for": "10.0.0.5", "user-agent": "Mozilla/5.0"}
        )
        
        assert response.status_code == 403
        assert "Suspicious activity detected" in response.json()["detail"]
        mock_usersession_actions.update.assert_called_once() # Session should be revoked
