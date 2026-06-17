from src.api.dependencies import get_current_user
from src.main import app

class MockUserB:
    def __init__(self):
        self.role = "ORG_ADMIN"
        self.tenantId = "tenant-B"
        self.id = "user-b"

def test_unauthorized_cross_tenant_override(client):
    # Override current_user to be from Tenant B
    app.dependency_overrides[get_current_user] = lambda: MockUserB()
    
    override_data = {
        "clinicianReviewStatus": "APPROVED",
        "amendmentNotes": "Looks good from Tenant B!"
    }
    
    # Try to access a session from Tenant A (uuid)
    # The repository will search in Tenant B due to tenant_id scoping and return None (404)
    response = client.put(
        "/api/v1/assessment-sessions/some-tenant-a-session-id/override",
        json=override_data
    )
    
    assert response.status_code == 404
    
    # Clean up
    app.dependency_overrides.clear()
