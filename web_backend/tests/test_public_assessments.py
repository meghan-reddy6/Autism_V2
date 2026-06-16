import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
import os

os.environ["OFFLINE_MODE"] = "True"

from src.main import app
from src.api.dependencies import validate_assessment_token

class MockPatient:
    firstName = "John"

class MockSession:
    def __init__(self, status="CREATED", tenantId="tenant1", createdBy="user1", id="s1"):
        self.id = id
        self.status = status
        self.tenantId = tenantId
        self.createdBy = createdBy
        self.patient = MockPatient()
        self.scaleType = "CARS"

def override_validate_token(token: str):
    if token == "valid-token":
        return MockSession(status="CREATED")
    elif token == "submitted-token":
        return MockSession(status="SUBMITTED")
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Invalid assessment token")

app.dependency_overrides[validate_assessment_token] = override_validate_token
client = TestClient(app)

@pytest.fixture(autouse=True)
def mock_external_services():
    with patch("src.controllers.patients.public_assessments.db") as mock_db, \
         patch("src.infrastructure.cache.redis_cache_manager.cache_service") as mock_cache:
        
        mock_db.assessmentresponse.create = AsyncMock()
        mock_db.assessmentsession.update = AsyncMock()
        mock_db.auditlog.create = AsyncMock()
        mock_cache.invalidate_tags = AsyncMock()
        
        yield mock_db, mock_cache

def test_get_assessment_form_valid():
    response = client.get("/api/v1/public/assessment/valid-token")
    assert response.status_code == 200
    assert response.json()["sessionId"] == "s1"
    assert response.json()["templateName"] == "CARS"

def test_get_assessment_form_invalid():
    response = client.get("/api/v1/public/assessment/invalid-token")
    assert response.status_code == 404

def test_submit_responses_duplicate():
    response = client.post("/api/v1/public/assessment/submitted-token/responses", json={"responses": []})
    assert response.status_code == 400
    assert "already submitted" in response.json()["detail"]

def test_submit_responses_success(mock_external_services):
    mock_db, mock_cache = mock_external_services
    
    response = client.post("/api/v1/public/assessment/valid-token/responses", json={
        "responses": [
            {"fieldName": "cars_1", "value": "Normal", "metadata": {"test": "data"}}
        ]
    })
    
    assert response.status_code == 200
    mock_db.assessmentresponse.create.assert_called_once()
    mock_db.assessmentsession.update.assert_called_once()
    mock_db.auditlog.create.assert_called_once()
    mock_cache.invalidate_tags.assert_called_once()

def test_submit_responses_audit_failure(mock_external_services):
    mock_db, mock_cache = mock_external_services
    mock_db.auditlog.create = AsyncMock(side_effect=Exception("DB Down"))
    
    response = client.post("/api/v1/public/assessment/valid-token/responses", json={"responses": []})
    assert response.status_code == 200 # Should not fail request
    mock_db.assessmentresponse.create.assert_called()

def test_save_draft_duplicate():
    response = client.post("/api/v1/public/assessment/submitted-token/save-draft", json={"responses": []})
    assert response.status_code == 400
    assert "already submitted" in response.json()["detail"]

def test_save_draft_success(mock_external_services):
    mock_db, mock_cache = mock_external_services
    
    response = client.post("/api/v1/public/assessment/valid-token/save-draft", json={"responses": []})
    assert response.status_code == 200
    mock_db.assessmentsession.update.assert_called_once()
    mock_db.auditlog.create.assert_called_once()
    mock_cache.invalidate_tags.assert_called_once()

def test_save_draft_audit_failure(mock_external_services):
    mock_db, mock_cache = mock_external_services
    mock_db.auditlog.create = AsyncMock(side_effect=Exception("DB Down"))
    
    response = client.post("/api/v1/public/assessment/valid-token/save-draft", json={"responses": []})
    assert response.status_code == 200 # Should not fail request
    mock_db.assessmentsession.update.assert_called_once()
