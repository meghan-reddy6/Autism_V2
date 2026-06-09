from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import require_roles
from database import db
from pydantic import BaseModel
from typing import List, Optional
import bcrypt

class OrganizationCreate(BaseModel):
    name: str
    subscriptionTier: str
    maxUsers: int = 500
    maxStorageGB: int = 100
    featureFlags: List[str] = []

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    subscriptionTier: Optional[str] = None
    status: Optional[str] = None
    maxUsers: Optional[int] = None
    maxStorageGB: Optional[int] = None

class UserCreate(BaseModel):
    email: str
    firstName: str
    lastName: str
    role: str
    tenantId: str
    password: str = "Welcome@123"

class UserUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: Optional[str] = None
    isActive: Optional[bool] = None

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Super Admin"],
    dependencies=[Depends(require_roles(["SUPER_ADMIN"]))]
)

@router.get("/organizations")
async def list_organizations():
    orgs = await db.tenant.find_many(
        order={"createdAt": "desc"}
    )
    
    result = []
    for org in orgs:
        user_count = await db.user.count(where={"tenantId": org.id})
        patient_count = await db.patient.count(where={"tenantId": org.id})
        
        org_dict = org.model_dump()
        org_dict["_count"] = {
            "users": user_count,
            "patients": patient_count
        }
        result.append(org_dict)
        
    return result

@router.post("/organizations")
async def create_organization(org: OrganizationCreate):
    from prisma import Json
    tenant = await db.tenant.create(
        data={
            "name": org.name,
            "subscriptionTier": org.subscriptionTier,
            "maxUsers": org.maxUsers,
            "maxStorageGB": org.maxStorageGB,
            "featureFlags": Json(org.featureFlags),
            "status": "ACTIVE"
        }
    )
    return tenant

@router.patch("/organizations/{org_id}")
async def update_organization(org_id: str, org: OrganizationUpdate):
    data_to_update = {k: v for k, v in org.model_dump().items() if v is not None}
    updated = await db.tenant.update(
        where={"id": org_id},
        data=data_to_update
    )
    return updated

@router.get("/organizations/{org_id}")
async def get_organization(org_id: str):
    org = await db.tenant.find_unique(
        where={"id": org_id}
    )
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    users = await db.user.find_many(where={"tenantId": org_id})
    patient_count = await db.patient.count(where={"tenantId": org_id})
    assessment_count = await db.assessmentsession.count(
        where={"patient": {"is": {"tenantId": org_id}}}
    )
    audit_logs = await db.auditlog.find_many(
        where={"tenantId": org_id},
        order={"timestamp": "desc"},
        take=5,
        include={"user": True}
    )
    
    org_dict = org.model_dump()
    org_dict["users"] = [u.model_dump() for u in users]
    org_dict["metrics"] = {
        "totalPatients": patient_count,
        "totalAssessments": assessment_count
    }
    org_dict["recentActivity"] = [log.model_dump() for log in audit_logs]
    
    return org_dict

@router.get("/users")
async def list_users():
    users = await db.user.find_many(
        include={"tenant": True}
    )
    return users

@router.post("/users")
async def create_user(user: UserCreate):
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(user.password.encode('utf-8'), salt).decode('utf-8')
    
    new_user = await db.user.create(
        data={
            "email": user.email,
            "passwordHash": hashed_pw,
            "firstName": user.firstName,
            "lastName": user.lastName,
            "role": user.role,
            "tenantId": user.tenantId
        }
    )
    return new_user

@router.patch("/users/{user_id}")
async def update_user(user_id: str, user: UserUpdate):
    data_to_update = {k: v for k, v in user.model_dump().items() if v is not None}
    updated = await db.user.update(
        where={"id": user_id},
        data=data_to_update
    )
    return updated

@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    try:
        await db.user.delete(where={"id": user_id})
        return {"message": "User permanently deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Cannot delete user. They may have dependent records. Try deactivating them instead.")

@router.get("/analytics")
async def get_analytics():
    total_tenants = await db.tenant.count()
    total_users = await db.user.count()
    total_patients = await db.patient.count()
    total_assessments = await db.assessmentsession.count()
    
    return {
        "totalTenants": total_tenants,
        "totalUsers": total_users,
        "totalPatients": total_patients,
        "totalAssessments": total_assessments
    }

@router.get("/roles")
async def get_roles():
    from auth.permissions import ROLE_PERMISSIONS
    return {"roles": list(ROLE_PERMISSIONS.keys()), "permissions_map": ROLE_PERMISSIONS}

@router.get("/audit-logs")
async def get_audit_logs():
    logs = await db.auditlog.find_many(
        order={"timestamp": "desc"},
        take=100,
        include={"user": True, "tenant": True}
    )
    return logs
