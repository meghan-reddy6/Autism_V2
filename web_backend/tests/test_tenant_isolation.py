import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from main import app

class MockUser:
    def __init__(self, role, tenantId):
        self.role = role
        self.tenantId = tenantId
        self.id = "u1"
        self.isActive = True

def test_tenant_isolation_get_patient():
    from dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: MockUser(role="DOCTOR", tenantId="tenant-A")
    client = TestClient(app)
    
    with patch('routers.patients.db') as mock_db:
        
        # Mocking the case where patient belongs to tenant-A
        class MockPatient:
            id = "p1"
            tenantId = "tenant-A"
        mock_db.patient.find_first = AsyncMock(return_value=MockPatient())
        mock_db.auditlog.create = AsyncMock()
        
        response = client.get("/api/v1/patients/p1")
        assert response.status_code == 200
        mock_db.patient.find_first.assert_called_with(where={"id": "p1", "tenantId": "tenant-A"}, include={"assessments": True, "clinicalNotes": True})
        
        # Mocking the case where patient does NOT belong to tenant-A (returns None because query filters by tenantId)
        mock_db.patient.find_first.return_value = None
        response2 = client.get("/api/v1/patients/p2")
        assert response2.status_code == 404
    
    app.dependency_overrides.clear()
