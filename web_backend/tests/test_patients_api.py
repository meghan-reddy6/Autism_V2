import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from src.main import app

@pytest.fixture
def client():
    return TestClient(app)

from src.api.dependencies import get_current_user

class MockUser:
    id = "test-user"
    tenantId = "tenant-1"
    role = "SUPER_ADMIN"

def override_get_current_user():
    return MockUser()

def test_list_patients_snapshot(client, snapshot):
    app.dependency_overrides[get_current_user] = override_get_current_user
    try:
        with patch('src.controllers.patients.patients.patient_service.list_patients', new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [
                {
                    "id": "p1", 
                    "firstName": "John", 
                    "lastName": "Doe", 
                    "mrn": "MRN-12345678", 
                    "gender": "Male",
                    "dateOfBirth": "1990-01-01T00:00:00Z"
                }
            ]
            response = client.get("/api/v1/patients")
            assert response.status_code == 200
            assert response.json() == snapshot
    finally:
        app.dependency_overrides.clear()
