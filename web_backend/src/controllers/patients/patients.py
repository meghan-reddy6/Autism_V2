from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Any

from src.infrastructure.auth.authorization import require_permission
from src.infrastructure.audit.audit_logger import log_audit
from src.schemas.patient import PatientCreate, PatientSummaryResponse
from src.services.patient_service import patient_service

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])

@router.post("", status_code=status.HTTP_201_CREATED, response_model=PatientSummaryResponse)
async def create_patient(
    patient: PatientCreate, 
    request: Request,
    current_user: Any = Depends(require_permission("create_patient"))
):
    from src.infrastructure.telemetry.request_context import get_user_role
    if get_user_role() == "DOCTOR":
        patient.assignedDoctorId = current_user.id
    return await patient_service.create_patient(patient)

@router.get("", response_model=list[PatientSummaryResponse])
async def list_patients(
    current_user: Any = Depends(require_permission("view_patient"))
):
    return await patient_service.list_patients()

@router.get("/{patient_id}", response_model=PatientSummaryResponse)
async def get_patient(
    patient_id: str,
    request: Request,
    current_user: Any = Depends(require_permission("view_patient"))
):
    patient = await patient_service.get_patient_with_summary(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Audit log for viewing a patient chart
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="VIEW_PATIENT_CHART",
        resource_type="Patient",
        resource_id=patient.get("id", patient_id) if isinstance(patient, dict) else patient.id,
        request=request
    )
    
    return patient

@router.get("/{patient_id}/assessments")
async def get_patient_assessments(
    patient_id: str,
    current_user: Any = Depends(require_permission("view_patient"))
):
    sessions = await patient_service.get_patient_assessments(patient_id)
    if sessions is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return sessions
