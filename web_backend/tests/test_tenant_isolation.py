import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from src.main import app

class MockUser:
    def __init__(self, role, tenantId):
        self.role = role
        self.tenantId = tenantId
        self.id = "u1"
        self.isActive = True

async def mock_get_current_user():
    from src.infrastructure.telemetry.request_context import current_tenant_id, current_user_role
    current_tenant_id.set("tenant-A")
    current_user_role.set("ORG_ADMIN")
    return MockUser(role="ORG_ADMIN", tenantId="tenant-A")

def test_tenant_isolation_get_patient():
    from src.api.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = mock_get_current_user
    client = TestClient(app)
    
    with patch('src.repositories.tenant_aware_repository.BaseRepository.find_first', new_callable=AsyncMock) as mock_find_first:
        
        # Mocking the case where patient belongs to tenant-A
        class MockPatient:
            id = "p1"
            tenantId = "tenant-A"
            mrn = "MRN-123"
            firstName = "John"
            lastName = "Doe"
            dateOfBirth = "1990-01-01T00:00:00Z"
            gender = "Male"
            def model_dump(self):
                return {"id": self.id, "tenantId": self.tenantId, "mrn": self.mrn, "firstName": self.firstName, "lastName": self.lastName, "dateOfBirth": self.dateOfBirth, "gender": self.gender}
        mock_find_first.return_value = MockPatient()
        
        with patch('src.controllers.patients.patients.log_audit') as mock_audit:
            mock_audit.return_value = None
            response = client.get("/api/v1/patients/p1")
            
        assert response.status_code == 200
        # The where clause is injected by TenantAwareRepository
        # Check that it injected tenantId="tenant-A" along with id="p1"
        call_args = mock_find_first.call_args[0][0] # The 'where' dictionary is passed as the first positional argument to super().find_first
        assert call_args == {"id": "p1", "tenantId": "tenant-A"}
        
        # Mocking the case where patient does NOT belong to tenant-A
        mock_find_first.return_value = None
        response2 = client.get("/api/v1/patients/p2")
        assert response2.status_code == 404
    
    app.dependency_overrides.clear()
