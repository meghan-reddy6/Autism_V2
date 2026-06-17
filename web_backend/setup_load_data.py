
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
