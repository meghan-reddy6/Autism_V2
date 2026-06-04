from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import httpx
import os
from prisma import Json
from datetime import datetime, timezone

from database import db
from dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8001/analyze")

@router.get("")
async def list_reports(
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    # Need to filter by tenantId, which means we join AssessmentSession
    reports = await db.report.find_many(
        where={
            "session": {
                "is": {
                    "tenantId": current_user.tenantId
                }
            }
        },
        include={
            "session": {
                "include": {
                    "patient": True,
                    "template": True
                }
            }
        },
        order={"createdAt": "desc"}
    )
    return reports

@router.post("/generate/{assessmentSessionId}")
async def generate_report(
    assessmentSessionId: str,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    session = await db.assessmentsession.find_unique(
        where={"id": assessmentSessionId},
        include={"template": True, "patient": True, "responses": True}
    )
    if not session or session.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Session not found")
        
    scale_type = session.template.type
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
    
    ml_metadata = {"status": "unavailable"}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(ML_SERVICE_URL, json=ml_payload, timeout=5.0)
            if response.status_code == 200:
                ml_metadata = response.json()
    except Exception as e:
        print(f"ML Warning: {e}")

    report = await db.report.create(
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
    
    await db.assessmentsession.update(
        where={"id": assessmentSessionId},
        data={"status": "UNDER_REVIEW"}
    )
    
    # Audit log
    await db.auditlog.create(data={
        "tenantId": current_user.tenantId,
        "userId": current_user.id,
        "action": "GENERATE_REPORT",
        "resource": "Report",
        "resourceId": report.id
    })
    
    return report

@router.get("/{reportId}")
async def get_report(
    reportId: str,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    report = await db.report.find_unique(
        where={"id": reportId},
        include={
            "session": {
                "include": {
                    "patient": True,
                    "template": True,
                    "responses": True
                }
            },
            "reportSections": True
        }
    )
    
    if not report or report.session.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return report

class SectionUpdate(BaseModel):
    name: str
    content: str
    order: int = 0

@router.patch("/{reportId}/sections")
async def add_report_section(
    reportId: str,
    section: SectionUpdate,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    report = await db.report.find_unique(
        where={"id": reportId},
        include={"session": True}
    )
    
    if not report or report.session.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report_section = await db.reportsection.create(
        data={
            "reportId": reportId,
            "name": section.name,
            "content": section.content,
            "order": section.order
        }
    )
    
    return report_section

@router.patch("/{reportId}/approve")
async def approve_report(
    reportId: str,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "DOCTOR", "PSYCHOLOGIST"]))
):
    report = await db.report.find_unique(
        where={"id": reportId},
        include={"session": True}
    )
    
    if not report or report.session.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Report not found")
        
    updated_report = await db.report.update(
        where={"id": reportId},
        data={
            "status": "APPROVED",
            "approvedBy": current_user.id,
            "approvedAt": datetime.now(timezone.utc)
        }
    )
    
    await db.assessmentsession.update(
        where={"id": report.session.id},
        data={
            "status": "APPROVED",
            "approvedBy": current_user.id
        }
    )
    
    await db.auditlog.create(data={
        "tenantId": current_user.tenantId,
        "userId": current_user.id,
        "action": "APPROVE_REPORT",
        "resource": "Report",
        "resourceId": report.id
    })
    
    return updated_report

@router.get("/{reportId}/export/pdf")
async def export_report_pdf(
    reportId: str,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    report = await db.report.find_unique(
        where={"id": reportId},
        include={"session": True}
    )
    
    if not report or report.session.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Placeholder for Phase 8 PDF Export
    return {"message": "PDF export will be implemented in Phase 8", "reportId": reportId}
