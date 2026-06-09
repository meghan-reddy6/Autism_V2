import asyncio
from fastapi.testclient import TestClient
from main import app
from database import db

async def test():
    await db.connect()
    client = TestClient(app)
    try:
        response = client.get("/api/v1/admin/organizations/test-id")
        print("Status:", response.status_code)
        print("Text:", response.text)
    finally:
        await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test())
