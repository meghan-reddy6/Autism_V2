import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from src.api.dependencies import require_roles
from src.main import app

class MockUser:
    def __init__(self, role):
        self.role = role
        self.tenantId = "t1"
        self.id = "u1"
        self.isActive = True

@app.get("/api/v1/test-rbac")
async def dummy_route(current_user = Depends(require_roles(["SUPER_ADMIN"]))):
    return {"message": "success"}

def test_rbac_success():
    from src.api.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: MockUser(role="SUPER_ADMIN")
    client = TestClient(app)
    
    response = client.get("/api/v1/test-rbac")
    assert response.status_code == 200
    assert response.json()["message"] == "success"
    
    app.dependency_overrides.clear()

def test_rbac_forbidden():
    from src.api.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: MockUser(role="CLINICAL_ADMIN")
    client = TestClient(app)
    
    response = client.get("/api/v1/test-rbac")
    assert response.status_code == 403
    
    app.dependency_overrides.clear()
