from locust import HttpUser, task, between, events
import asyncio
import os
import random
import uuid
import sys
import subprocess

# We need to ensure 50 tenants exist in the DB for the simulation.
# We'll run a quick setup script before the test starts to generate test users if they don't exist.

setup_script = """
import asyncio
import bcrypt
from prisma import Prisma

async def setup():
    db = Prisma()
    await db.connect()
    
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(b"Admin@123", salt).decode('utf-8')
    
    for i in range(50):
        tenant_name = f"LoadTenant_{i}"
        tenant = await db.organization.find_first(where={"name": tenant_name})
        if not tenant:
            tenant = await db.organization.create({
                "name": tenant_name,
                "subscriptionPlan": "ENTERPRISE",
                "status": "ACTIVE"
            })
            
            user = await db.user.create({
                "email": f"load_doctor_{i}@clinic.com",
                "passwordHash": hashed_pw,
                "firstName": "Load",
                "lastName": "Doctor",
                "role": "DOCTOR",
                "tenantId": tenant.id
            })
            
            patient = await db.patient.create({
                "tenantId": tenant.id,
                "assignedDoctorId": user.id,
                "mrn": f"MRN_LOAD_{i}",
                "firstName": "Test",
                "lastName": "Patient",
                "dateOfBirth": "2020-01-01T00:00:00Z",
                "gender": "Other"
            })
            print(f"Created {tenant_name}")
            
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(setup())
"""

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("Initializing 50 distinct tenants for load testing...")
    with open("setup_load_data.py", "w") as f:
        f.write(setup_script)
    subprocess.run([sys.executable, "setup_load_data.py"], check=True)
    print("Tenants initialized.")

class ClinicalUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Pick a random tenant/doctor from our 50 spawned entities
        self.tenant_idx = random.randint(0, 49)
        self.email = f"load_doctor_{self.tenant_idx}@clinic.com"
        self.password = "Admin@123"
        self.token = None
        self.login()

    def login(self):
        # Authenticate
        resp = self.client.post("/api/v1/auth/login", data={
            "username": self.email,
            "password": self.password
        })
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            print(f"Failed to login as {self.email}: {resp.text}")

    @task(3)
    def submit_public_assessment(self):
        if not self.token:
            return
            
        # 1. First, we must fetch the patient ID for this tenant
        patients_resp = self.client.get("/api/v1/patients")
        if patients_resp.status_code != 200 or not patients_resp.json():
            return
        
        patient_id = patients_resp.json()[0].get("id")
        
        # 2. Create an Assessment Session to get a public token
        session_resp = self.client.post("/api/v1/assessment-sessions", json={
            "patientId": patient_id,
            "scaleType": "CARS"
        }, name="/api/v1/assessment-sessions")
        
        if session_resp.status_code not in [200, 201]:
            return
            
        public_token = session_resp.json().get("token")
        session_id = session_resp.json().get("id")
        
        # 3. Simulate parent submitting public assessment
        payload = {
            "responses": [
                {"fieldName": "cars_1", "value": "Normal"},
                {"fieldName": "cars_2", "value": "Mildly abnormal"},
                {"fieldName": "cars_3", "value": "Normal"},
                {"fieldName": "cars_4", "value": "Moderately abnormal"},
                {"fieldName": "cars_5", "value": "Normal"},
                {"fieldName": "cars_6", "value": "Normal"},
                {"fieldName": "cars_7", "value": "Normal"},
                {"fieldName": "cars_8", "value": "Mildly abnormal"},
                {"fieldName": "cars_9", "value": "Normal"},
                {"fieldName": "cars_10", "value": "Normal"},
                {"fieldName": "cars_11", "value": "Normal"},
                {"fieldName": "cars_12", "value": "Normal"},
                {"fieldName": "cars_13", "value": "Normal"},
                {"fieldName": "cars_14", "value": "Normal"},
                {"fieldName": "cars_15", "value": "Normal"}
            ]
        }
        
        submit_resp = self.client.post(f"/api/v1/public/assessment/{public_token}/responses", json=payload, name="/api/v1/public/assessment/responses")
        
        # 4. Poll the report until it finishes ML processing (simulating clinician polling)
        if submit_resp.status_code == 200:
            for _ in range(10): # Poll up to 10 times
                poll_resp = self.client.get(f"/api/v1/assessment-sessions/{session_id}", name="/api/v1/assessment-sessions/{id}")
                if poll_resp.status_code == 200:
                    status = poll_resp.json().get("status")
                    if status in ["UNDER_REVIEW", "AI_GENERATED"]:
                        break # Report generated!
                import time
                time.sleep(0.5)

    @task(1)
    def fetch_dashboard(self):
        if self.token:
            self.client.get("/api/v1/dashboard/stats")
