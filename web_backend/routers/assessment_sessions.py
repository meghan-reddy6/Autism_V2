from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from dependencies import get_current_user
from database import db
from datetime import datetime, timezone
import uuid
import httpx
import os
from prisma import Json
from notifications.service import send_assessment_link
from auth.authorization import require_permission
from audit.logger import log_audit
from fastapi import Request

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8001/analyze")

router = APIRouter(
    prefix="/api/v1/assessment-sessions",
    tags=["Assessment Sessions"]
)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(session_data: dict, request: Request, current_user = Depends(require_permission("create_assessment_session"))):
    tenant_id = current_user.tenantId
    
    template = None
    if "templateId" in session_data:
        template = await db.assessmenttemplate.find_unique(where={"id": session_data["templateId"]})
    elif "scaleType" in session_data:
        template = await db.assessmenttemplate.find_first(where={"type": session_data["scaleType"], "tenantId": tenant_id})
        if not template:
            template = await db.assessmenttemplate.find_first(where={"type": session_data["scaleType"]})
            
    if not template:
        raise HTTPException(status_code=400, detail="Template not found")
        
    token = str(uuid.uuid4())
    
    session = await db.assessmentsession.create(
        data={
            "token": token,
            "tenantId": tenant_id,
            "patientId": session_data["patientId"],
            "assessmentTemplateId": template.id,
            "status": "CREATED",
            "createdBy": current_user.id
        }
    )
    
    patient = await db.patient.find_unique(where={"id": session_data["patientId"]})
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
    session = await db.assessmentsession.find_unique(
        where={"id": session_id},
        include={"template": True, "patient": True, "responses": True, "reports": True}
    )
    if not session or session.tenantId != current_user.tenantId or session.isDeleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("")
async def list_sessions(patientId: Optional[str] = None, status: Optional[str] = None, current_user = Depends(require_permission("view_assessment_session"))):
    where_clause = {"tenantId": current_user.tenantId, "isDeleted": False}
    if patientId:
        where_clause["patientId"] = patientId
    if status:
        where_clause["status"] = status
        
    sessions = await db.assessmentsession.find_many(
        where=where_clause,
        include={"template": True, "patient": True},
        order={"createdAt": "desc"}
    )
    return sessions

@router.patch("/{session_id}/status")
async def update_status(session_id: str, status_data: dict, request: Request, current_user = Depends(require_permission("view_assessment_session"))):
    session = await db.assessmentsession.find_unique(where={"id": session_id})
    if not session or session.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Session not found")
        
    new_status = status_data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status required")
        
    updated = await db.assessmentsession.update(
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
async def delete_session(session_id: str, request: Request, current_user = Depends(require_permission("create_assessment_session"))):
    session = await db.assessmentsession.find_unique(where={"id": session_id})
    if not session or session.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Soft delete the session
    await db.assessmentsession.update(
        where={"id": session_id},
        data={
            "isDeleted": True, 
            "deletedAt": datetime.now(timezone.utc),
            "deletedBy": current_user.id
        }
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


