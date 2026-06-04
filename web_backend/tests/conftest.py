import pytest
from fastapi.testclient import TestClient
from main import app
from dependencies import get_current_user

# Mock User Object
class MockUser:
    def __init__(self, role="DOCTOR", tenantId="test-tenant-1", id="test-user-1"):
        self.role = role
        self.tenantId = tenantId
        self.id = id

@pytest.fixture
def client():
    # Override dependencies
    def override_get_current_user():
        return MockUser()
        
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with TestClient(app) as client:
        yield client
        
    # Clear overrides
    app.dependency_overrides.clear()
