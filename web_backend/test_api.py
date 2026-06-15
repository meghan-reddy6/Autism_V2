import asyncio
import httpx

async def test_api():
    async with httpx.AsyncClient() as client:
        # 1. Login
        resp = await client.post("http://127.0.0.1:8001/api/v1/auth/login", data={"username": "superadmin@example.com", "password": "password123"})
        if resp.status_code != 200:
            print("Login failed:", resp.status_code, resp.text)
            # Try clinical admin
            resp = await client.post("http://127.0.0.1:8001/api/v1/auth/login", data={"username": "orgadmin@example.com", "password": "password123"})
            if resp.status_code != 200:
                print("Login failed again:", resp.status_code, resp.text)
                return
                
        token = resp.json()["access_token"]
        print("Logged in. Token:", token[:10], "...")
        
        # 2. Get sessions
        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.get("http://127.0.0.1:8001/api/v1/assessment-sessions", headers=headers)
        print("GET /api/v1/assessment-sessions ->", resp.status_code)
        print(resp.text)
        
        # 3. Create session (to reproduce second error)
        # Find a patient first
        p_resp = await client.get("http://127.0.0.1:8001/api/v1/patients", headers=headers)
        if p_resp.status_code == 200 and p_resp.json():
            patient_id = p_resp.json()[0]["id"]
            resp = await client.post("http://127.0.0.1:8001/api/v1/assessment-sessions", json={"patientId": patient_id, "scaleType": "CARS"}, headers=headers)
            print("POST /api/v1/assessment-sessions ->", resp.status_code)
            print(resp.text)

if __name__ == "__main__":
    asyncio.run(test_api())
