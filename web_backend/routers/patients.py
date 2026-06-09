import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

from database import db
from auth.authorization import require_permission
from audit.logger import log_audit
from fastapi import Request

router = APIRouter(prefix="/api/v1/patients", tags=["patients"])

class PatientCreate(BaseModel):
    firstName: str
    lastName: str
    dateOfBirth: datetime
    gender: str
    guardianName: Optional[str] = None
    guardianEmail: Optional[str] = None
    guardianPhone: Optional[str] = None
    emergencyContact: Optional[str] = None
    address: Optional[str] = None
    referringPhysician: Optional[str] = None

def generate_mrn() -> str:
    # Generates a pseudo-random MRN for this example
    return f"MRN-{uuid.uuid4().hex[:8].upper()}"

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient: PatientCreate, 
    request: Request,
    current_user: Any = Depends(require_permission("create_patient"))
):
    # Generate unique MRN
    new_mrn = generate_mrn()
    
    new_patient = await db.patient.create(data={
        "tenantId": current_user.tenantId,
        "mrn": new_mrn,
        "firstName": patient.firstName,
        "lastName": patient.lastName,
        "dateOfBirth": patient.dateOfBirth,
        "gender": patient.gender,
        "guardianName": patient.guardianName,
        "guardianEmail": patient.guardianEmail,
        "guardianPhone": patient.guardianPhone,
        "emergencyContact": patient.emergencyContact,
        "address": patient.address,
        "referringPhysician": patient.referringPhysician
    })
    
    # Audit log
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="CREATE_PATIENT",
        resource_type="Patient",
        resource_id=new_patient.id,
        request=request
    )
    
    return new_patient

@router.get("")
async def list_patients(
    current_user: Any = Depends(require_permission("view_patient"))
):
    patients = await db.patient.find_many(
        where={"tenantId": current_user.tenantId},
        order={"createdAt": "desc"}
    )
    return patients

@router.get("/{patient_id}")
async def get_patient(
    patient_id: str,
    request: Request,
    current_user: Any = Depends(require_permission("view_patient"))
):
    patient = await db.patient.find_first(
        where={
            "id": patient_id,
            "tenantId": current_user.tenantId
        },
        include={
            "assessmentSessions": {
                "include": {
                    "reports": True
                }
            },
            "clinicalNotes": True
        }
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Audit log for viewing a patient chart
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="VIEW_PATIENT_CHART",
        resource_type="Patient",
        resource_id=patient.id,
        request=request
    )
    
    # Calculate summary info
    patient_dict = patient.model_dump() if hasattr(patient, "model_dump") else patient
    if isinstance(patient_dict, dict):
        patient_dict["clinicalNotesCount"] = len(patient_dict.get("clinicalNotes", []))
        return patient_dict
    
    return patient

@router.get("/{patient_id}/assessments")
async def get_patient_assessments(
    patient_id: str,
    current_user: Any = Depends(require_permission("view_patient"))
):
    patient = await db.patient.find_first(
        where={"id": patient_id, "tenantId": current_user.tenantId}
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    sessions = await db.assessmentsession.find_many(
        where={
            "patientId": patient_id,
            "tenantId": current_user.tenantId
        },
        include={
            "template": True,
            "reports": True
        },
        order={"createdAt": "desc"}
    )
    return sessions
