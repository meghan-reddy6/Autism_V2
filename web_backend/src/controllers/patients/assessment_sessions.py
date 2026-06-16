from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from src.api.dependencies import get_current_user
from src.database import db
from datetime import datetime, timezone
import uuid
import httpx
import os
from prisma import Json
from src.infrastructure.notifications.emailDispatcher import send_assessment_link
from src.infrastructure.auth.authorization import require_permission
from src.infrastructure.audit.audit_logger import log_audit
from fastapi import Request
from src.repositories.tenant_aware_repository import assessment_session_repo, patient_repo

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8001/analyze")

router = APIRouter(
    prefix="/api/v1/assessment-sessions",
    tags=["Assessment Sessions"]
)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(session_data: dict, request: Request, current_user = Depends(require_permission("create_assessment_session"))):
    tenant_id = current_user.tenantId
    scale_type = session_data.get("scaleType")
    if not scale_type:
        raise HTTPException(status_code=400, detail="scaleType is required")
        
    token = str(uuid.uuid4())
    
    session = await assessment_session_repo.create(
        tenant_id=tenant_id,
        data={
            "token": token,
            "patientId": session_data["patientId"],
            "scaleType": scale_type,
            "status": "CREATED",
            "createdBy": current_user.id
        }
    )
    
    patient = await patient_repo.get_by_id(tenant_id, session_data["patientId"])
    if patient and patient.guardianEmail:
        patient_name = f"{patient.firstName} {patient.lastName}"
        await send_assessment_link(patient.guardianEmail, patient_name, token)
        
    await log_audit(
        user_id=current_user.id,
        tenant_id=tenant_id,
        action="CREATE_ASSESSMENT_SESSION",
        resource_type="AssessmentSession",
        resource_id=session.id,
        request=request
    )
    
    return {"id": session.id, "token": token, "message": "Assessment session created"}

@router.get("/{session_id}")
async def get_session(session_id: str, request: Request, current_user = Depends(require_permission("view_assessment_session"))):
    session = await assessment_session_repo.get_by_id(
        tenant_id=current_user.tenantId,
        id=session_id,
        include={"patient": True, "responses": True, "reports": True}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    from src.infrastructure.telemetry.request_context import get_user_role
    if get_user_role() == "DOCTOR" and getattr(session.patient, "assignedDoctorId", None) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this patient's session")
        
    return session

@router.get("")
async def list_sessions(patientId: Optional[str] = None, status: Optional[str] = None, current_user = Depends(require_permission("view_assessment_session"))):
    where_clause = {}
    if patientId:
        where_clause["patientId"] = patientId
    if status:
        where_clause["status"] = status
        
    from src.infrastructure.telemetry.request_context import get_user_role
    if get_user_role() == "DOCTOR":
        where_clause["patient"] = {"assignedDoctorId": current_user.id}
        
    sessions = await assessment_session_repo.find_many(
        tenant_id=current_user.tenantId,
        where=where_clause,
        include={"patient": True, "reports": True},
        order={"createdAt": "desc"}
    )
    return sessions

@router.patch("/{session_id}/status")
async def update_status(session_id: str, status_data: dict, request: Request, current_user = Depends(require_permission("update_assessment_session"))):
    session = await assessment_session_repo.get_by_id(current_user.tenantId, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status required")
        
    # State transition validation
    from src.services.assessment_workflow import validate_assessment_session_transition
    if not validate_assessment_session_transition(session.status, new_status):
        raise HTTPException(status_code=409, detail=f"Invalid transition from {session.status} to {new_status}")
        
    updated = await assessment_session_repo.update(
        tenant_id=current_user.tenantId,
        where={"id": session_id},
        data={"status": new_status, "updatedAt": datetime.now(timezone.utc)}
    )
    
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action=f"UPDATE_SESSION_STATUS_{new_status}",
        resource_type="AssessmentSession",
        resource_id=session_id,
        request=request
    )
    
    return updated

@router.delete("/{session_id}")
async def delete_session(session_id: str, request: Request, current_user = Depends(require_permission("delete_assessment_session"))):
    session = await assessment_session_repo.get_by_id(current_user.tenantId, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Soft delete the session
    await assessment_session_repo.soft_delete(
        tenant_id=current_user.tenantId,
        where={"id": session_id},
        deleted_by=current_user.id
    )
    
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="DELETE_SESSION",
        resource_type="AssessmentSession",
        resource_id=session_id,
        request=request
    )
    
    return {"message": "Assessment session deleted successfully"}


