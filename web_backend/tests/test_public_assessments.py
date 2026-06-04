import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from main import app
from dependencies import validate_assessment_token

# Mock Token Validator
class MockSession:
    id = "s1"
    status = "CREATED"
    class MockPatient:
        firstName = "John"
    patient = MockPatient()
    class MockTemplate:
        name = "CARS"
        formSchema = {}
    template = MockTemplate()
    expiresAt = None

def override_validate_token(token: str):
    if token == "valid-token":
        return MockSession()
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Invalid token")

@pytest.fixture(autouse=True)
def mock_dependencies_db():
    with patch('database.db') as mock_db:
        mock_db.assessmentsession.find_unique = AsyncMock(return_value=MockSession())
        yield mock_db

app.dependency_overrides[validate_assessment_token] = override_validate_token
client = TestClient(app)

def test_get_assessment_form_valid(mock_dependencies_db):
    response = client.get("/api/v1/public/assessment/valid-token")
    assert response.status_code == 200
    assert response.json()["sessionId"] == "s1"
    assert response.json()["templateName"] == "CARS"

def test_get_assessment_form_invalid(mock_dependencies_db):
    mock_dependencies_db.assessmentsession.find_unique = AsyncMock(return_value=None)
    response = client.get("/api/v1/public/assessment/invalid-token")
    assert response.status_code == 404

def test_submit_responses(mock_dependencies_db):
    with patch('routers.public_assessments.db') as mock_db:
        mock_db.assessmentresponse.create = AsyncMock()
        mock_db.assessmentsession.update = AsyncMock()
        
        response = client.post("/api/v1/public/assessment/valid-token/responses", json={
            "responses": [
                {"fieldName": "cars_1", "value": "Normal"}
            ]
        })
        assert response.status_code == 200
        mock_db.assessmentresponse.create.assert_called_once()
        mock_db.assessmentsession.update.assert_called_once()
