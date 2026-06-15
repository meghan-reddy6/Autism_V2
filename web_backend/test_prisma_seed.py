import asyncio
from database import db
from prisma import Json

async def test_db():
    await db.connect()
    try:
        # Create a tenant and user and patient
        tenant = await db.organization.create({"name": "Test Org", "subscriptionPlan": "ENTERPRISE", "status": "ACTIVE", "maxUsers": 10, "maxStorageGB": 10, "maxAssessments": 10})
        user = await db.user.create({"tenantId": tenant.id, "email": "test@test.com", "role": "DOCTOR", "passwordHash": "123"})
        patient = await db.patient.create({
            "tenantId": tenant.id,
            "assignedDoctorId": user.id,
            "mrn": "MRN123",
            "firstName": "John",
            "lastName": "Doe",
            "dateOfBirth": "2020-01-01T00:00:00Z",
            "gender": "Male"
        })
        
        session = await db.assessmentsession.create(data={
            "tenantId": tenant.id,
            "patientId": patient.id,
            "scaleType": "M-CHAT-R",
            "createdBy": user.id
        })
        
        print(f"Created session {session.id}")
        
        # Now fetch it the exact way list_sessions does
        sessions = await db.assessmentsession.find_many(
            include={"patient": True, "reports": True}
        )
        print(f"Fetched {len(sessions)} sessions")
        
        # Simulate FastAPI serialization
        from fastapi.encoders import jsonable_encoder
        encoded = jsonable_encoder(sessions)
        import json
        json.dumps(encoded)
        print("Serialized successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_db())
