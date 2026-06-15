import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from dependencies import get_current_user

class MockUser:
    id = "u1"
    tenantId = "tenant-1"
    role = "ORG_ADMIN"
    isActive = True
    
    def __init__(self):
        self.role = "ORG_ADMIN"

def override_get_current_user():
    from infrastructure.context import current_tenant_id, current_user_id, current_user_role
    current_tenant_id.set("tenant-1")
    current_user_id.set("u1")
    current_user_role.set("ORG_ADMIN")
    return MockUser()

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

async def run_tests():
    from database import db
    await db.connect()
    
    print("--- Testing GET /api/v1/assessment-sessions ---")
    try:
        response = client.get("/api/v1/assessment-sessions")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Exception caught: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Testing GET /api/v1/assessment-inbox ---")
    try:
        response = client.get("/api/v1/assessment-inbox")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Exception caught: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Testing GET /api/v1/reports ---")
    try:
        response = client.get("/api/v1/reports")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Exception caught: {e}")
        import traceback
        traceback.print_exc()
        
    await db.disconnect()

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_tests())
