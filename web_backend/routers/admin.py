from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import require_roles
from database import db

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

@router.get("/users")
async def list_users():
    users = await db.user.find_many(
        include={"tenant": True},
        order={"createdAt": "desc"}
    )
    return users

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
