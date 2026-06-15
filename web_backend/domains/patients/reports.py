from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import httpx
import os
from prisma import Json
from datetime import datetime, timezone

from database import db
from auth.authorization import require_permission
from audit.logger import log_audit
from fastapi import Request
from infrastructure.tenantAwareRepository import report_repo, assessment_session_repo, report_section_repo
from infrastructure.state_machine import validate_report_transition, validate_assessment_session_transition

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

from domains.patients.ml_client import fetch_ml_metadata

@router.get("")
async def list_reports(
    current_user: Any = Depends(require_permission("view_assessment_session"))
):
    where_clause = {}
    from infrastructure.context import get_user_role
    if get_user_role() == "DOCTOR":
        where_clause["session"] = {"patient": {"assignedDoctorId": current_user.id}}
        
    reports = await report_repo.find_many(
        tenant_id=current_user.tenantId,
        where=where_clause,
        include={
            "session": {
                "include": {
                    "patient": True
                }
            }
        },
        order={"createdAt": "desc"}
    )
    return reports

@router.post("/generate/{assessmentSessionId}")
async def generate_report(
    assessmentSessionId: str,
    request: Request,
    current_user: Any = Depends(require_permission("create_clinical_note"))
):
    session = await assessment_session_repo.get_by_id(
        tenant_id=current_user.tenantId,
        id=assessmentSessionId,
        include={"patient": True, "responses": True}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    scale_type = session.scaleType
    total_score = 0
    ml_features = {}

    for resp in session.responses:
        val = resp.value
        score = 0
        
        if scale_type == "CARS":
            if val == "Normal": score = 1
            elif val == "Mildly abnormal": score = 2
            elif val == "Moderately abnormal": score = 3
            elif val == "Severely abnormal": score = 4
        elif scale_type == "M-CHAT-R":
            if resp.fieldName in ["mchat_2", "mchat_5", "mchat_12"]:
                if val == "Yes": score = 1
            else:
                if val == "No": score = 1
        elif scale_type == "GARS-2":
            if val == "Never": score = 0
            elif val == "Seldom": score = 1
            elif val == "Sometimes": score = 2
            elif val == "Frequently": score = 3
            
        total_score += score
        ml_features[resp.fieldName] = score
        
    ml_payload = {
        "scale_type": scale_type,
        "normalized_score": total_score,
        "age_months": 36, # Placeholder
        "features": ml_features
    }
    
    ml_metadata = await fetch_ml_metadata(ml_payload)

    report = await report_repo.create(
        tenant_id=current_user.tenantId,
        data={
            "assessmentSessionId": assessmentSessionId,
            "status": "AI_GENERATED",
            "sections": Json({
                "scaleType": scale_type,
                "totalScore": total_score,
                "predictedRisk": ml_metadata.get("risk_level"),
                "confidence": ml_metadata.get("confidence_score"),
                "shapValues": ml_metadata.get("shap_breakdown", {}),
                "itemScores": ml_features
            })
        }
    )
    
    # State machine transition for session
    if not validate_assessment_session_transition(session.status, "UNDER_REVIEW"):
        raise HTTPException(status_code=409, detail=f"Cannot transition session from {session.status} to UNDER_REVIEW")
        
    await assessment_session_repo.update(
        tenant_id=current_user.tenantId,
        where={"id": assessmentSessionId},
        data={"status": "UNDER_REVIEW"}
    )
    
    # Audit log
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="GENERATE_REPORT",
        resource_type="Report",
        resource_id=report.id,
        request=request
    )
    
    return report

@router.get("/{reportId}")
async def get_report(
    reportId: str,
    current_user: Any = Depends(require_permission("view_assessment_session"))
):
    report = await report_repo.get_by_id(
        tenant_id=current_user.tenantId,
        id=reportId,
        include={
            "session": {
                "include": {
                    "patient": True,
                    "responses": True
                }
            },
            "reportSections": True
        }
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    from infrastructure.context import get_user_role
    if get_user_role() == "DOCTOR" and getattr(report.session.patient, "assignedDoctorId", None) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this patient's report")
        
    return report

class SectionUpdate(BaseModel):
    name: str
    content: str
    order: int = 0

@router.patch("/{reportId}/sections")
async def add_report_section(
    reportId: str,
    section: SectionUpdate,
    request: Request,
    current_user: Any = Depends(require_permission("update_report"))
):
    report = await report_repo.get_by_id(
        tenant_id=current_user.tenantId,
        id=reportId,
        include={"session": True}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.status == "APPROVED" or report.status == "ARCHIVED":
        raise HTTPException(status_code=409, detail="Cannot modify sections of an approved or archived report")
        
    report_section = await report_section_repo.create(
        tenant_id=current_user.tenantId,
        data={
            "reportId": reportId,
            "name": section.name,
            "content": section.content,
            "order": section.order
        }
    )
    
    return report_section

@router.patch("/{reportId}/status")
async def update_report_status(
    reportId: str,
    status_data: dict,
    request: Request,
    current_user: Any = Depends(require_permission("approve_report"))
):
    report = await report_repo.get_by_id(
        tenant_id=current_user.tenantId,
        id=reportId,
        include={"session": True}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    new_status = status_data.get("status")
    if not validate_report_transition(report.status, new_status):
        raise HTTPException(status_code=409, detail=f"Invalid transition from {report.status} to {new_status}")
        
    update_data = {"status": new_status, "updatedAt": datetime.now(timezone.utc)}
    
    if new_status == "APPROVED":
        update_data["approvedBy"] = current_user.id
        update_data["approvedAt"] = datetime.now(timezone.utc)
        
        # Also transition session to APPROVED
        if validate_assessment_session_transition(report.session.status, "APPROVED"):
            await assessment_session_repo.update(
                tenant_id=current_user.tenantId,
                where={"id": report.session.id},
                data={
                    "status": "APPROVED",
                    "approvedBy": current_user.id
                }
            )
        
    updated_report = await report_repo.update(
        tenant_id=current_user.tenantId,
        where={"id": reportId},
        data=update_data
    )
    
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action=f"REPORT_STATUS_{new_status}",
        resource_type="Report",
        resource_id=report.id,
        request=request
    )
    
    return updated_report

@router.patch("/{reportId}/approve")
async def approve_report(
    reportId: str,
    request: Request,
    current_user: Any = Depends(require_permission("approve_report"))
):
    # Delegate to the state machine endpoint
    return await update_report_status(reportId, {"status": "APPROVED"}, request, current_user)

@router.get("/{reportId}/export/pdf")
async def export_report_pdf(
    reportId: str,
    current_user: Any = Depends(require_permission("view_assessment_session"))
):
    report = await report_repo.get_by_id(
        tenant_id=current_user.tenantId,
        id=reportId,
        include={"session": True}
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Placeholder for Phase 8 PDF Export
    return {"message": "PDF export will be implemented in Phase 8", "reportId": reportId}
