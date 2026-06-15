from main import app
from dependencies import get_current_user

class MockUser:
    id = "u1"
    tenantId = "tenant-1"
    role = "ORG_ADMIN"
    isActive = True

async def override_get_current_user():
    from infrastructure.context import current_tenant_id, current_user_id, current_user_role
    current_tenant_id.set("tenant-1")
    current_user_id.set("u1")
    current_user_role.set("ORG_ADMIN")
    return MockUser()

app.dependency_overrides[get_current_user] = override_get_current_user
