from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import require_roles
from database import db
from pydantic import BaseModel
from typing import List, Optional
import bcrypt

class OrganizationCreate(BaseModel):
    name: str
    subscriptionPlan: str
    maxUsers: int = 500
    maxStorageGB: int = 100
    featureFlags: List[str] = []

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    subscriptionPlan: Optional[str] = None
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

from domains.admin.shared_logic import UserUpdateBase, create_hashed_user

class UserUpdate(UserUpdateBase):
    pass

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Super Admin"],
    dependencies=[Depends(require_roles(["SUPER_ADMIN"]))]
)

@router.get("/organizations")
async def list_organizations():
    orgs = await db.organization.find_many(
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
    tenant = await db.organization.create(
        data={
            "name": org.name,
            "subscriptionPlan": org.subscriptionPlan,
            "maxUsers": org.maxUsers,
            "maxStorageGB": org.maxStorageGB,
            "featureFlags": Json(org.featureFlags),
            "status": "ACTIVE"
        }
    )
    
    from infrastructure.context import get_user_id, get_tenant_id
    import json
    await db.auditlog.create(
        data={
            "tenantId": get_tenant_id() or tenant.id,
            "userId": get_user_id() or "SYSTEM",
            "action": "CREATE_TENANT",
            "resource": "tenant",
            "resourceId": tenant.id,
            "changes": json.dumps({"name": org.name, "tier": org.subscriptionPlan})
        }
    )
    
    return tenant

@router.patch("/organizations/{org_id}")
async def update_organization(org_id: str, org: OrganizationUpdate):
    data_to_update = {k: v for k, v in org.model_dump().items() if v is not None}
    updated = await db.organization.update(
        where={"id": org_id},
        data=data_to_update
    )
    
    from infrastructure.context import get_user_id, get_tenant_id
    import json
    await db.auditlog.create(
        data={
            "tenantId": get_tenant_id() or org_id,
            "userId": get_user_id() or "SYSTEM",
            "action": "UPDATE_TENANT",
            "resource": "tenant",
            "resourceId": org_id,
            "changes": json.dumps(data_to_update)
        }
    )
    
    return updated

@router.get("/organizations/{org_id}")
async def get_organization(org_id: str):
    org = await db.organization.find_unique(
        where={"id": org_id}
    )
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    users = await db.user.find_many(where={"tenantId": org_id})
    patient_count = await db.patient.count(where={"tenantId": org_id})
    assessment_count = await db.assessmentsession.count(
        where={"tenantId": org_id}
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
    new_user = await create_hashed_user(user, user.tenantId)
    
    from infrastructure.context import get_user_id, get_tenant_id
    import json
    await db.auditlog.create(
        data={
            "tenantId": get_tenant_id() or user.tenantId,
            "userId": get_user_id() or "SYSTEM",
            "action": "CREATE_USER",
            "resource": "user",
            "resourceId": new_user.id,
            "changes": json.dumps({"email": user.email, "role": user.role, "tenantId": user.tenantId})
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
    
    from infrastructure.context import get_user_id, get_tenant_id
    import json
    await db.auditlog.create(
        data={
            "tenantId": get_tenant_id() or updated.tenantId,
            "userId": get_user_id() or "SYSTEM",
            "action": "UPDATE_USER",
            "resource": "user",
            "resourceId": user_id,
            "changes": json.dumps(data_to_update)
        }
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
    total_tenants = await db.organization.count()
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
