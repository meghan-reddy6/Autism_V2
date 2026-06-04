from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import get_current_user, require_roles
from repositories import patient_repo, user_repo, assessment_repo, report_repo
from typing import Any

# Only CLINICAL_ADMIN and up can access recycle bin actions
router = APIRouter(
    prefix="/api/v1/recycle-bin",
    tags=["Recycle Bin"],
    dependencies=[Depends(require_roles("CLINICAL_ADMIN"))]
)

@router.get("/patients")
async def list_deleted_patients(current_user: Any = Depends(get_current_user)):
    # Platform Admins can see all deleted patients, Tenant Admins only their tenant
    where = {"isDeleted": True}
    if current_user.role not in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        where["tenantId"] = current_user.tenantId
        
    patients = await patient_repo.find_many(where=where, include_deleted=True)
    return {"deleted_patients": patients}

@router.post("/patients/{patient_id}/restore")
async def restore_patient(patient_id: str, current_user: Any = Depends(get_current_user)):
    where = {"id": patient_id}
    if current_user.role not in ["SUPER_ADMIN", "PLATFORM_ADMIN"]:
        where["tenantId"] = current_user.tenantId
        
    patient = await patient_repo.find_first(where=where, include_deleted=True)
    if not patient:
        raise HTTPException(status_code=404, detail="Deleted patient not found")
        
    await patient_repo.restore({"id": patient_id})
    return {"message": "Patient restored successfully"}

@router.delete("/patients/{patient_id}/purge", dependencies=[Depends(require_roles("SUPER_ADMIN"))])
async def purge_patient(patient_id: str):
    """Hard delete a patient - SUPER ADMIN ONLY"""
    await patient_repo.hard_delete({"id": patient_id})
    return {"message": "Patient permanently purged from system"}
