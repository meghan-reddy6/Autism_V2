from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import validate_assessment_token
from database import db
from datetime import datetime, timezone
import json

router = APIRouter(
    prefix="/api/v1/public/assessment",
    tags=["Public Assessments"]
)

@router.get("/{token}")
async def get_assessment_form(token: str, session = Depends(validate_assessment_token)):
    return {
        "sessionId": session.id,
        "status": session.status,
        "patientFirstName": session.patient.firstName if session.patient else None,
        "templateName": session.scaleType,
        "schema": None, # Removed since AssessmentTemplate is obsolete
    }

@router.post("/{token}/responses")
async def submit_responses(token: str, data: dict, session = Depends(validate_assessment_token)):
    if session.status in ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail="Assessment already submitted")
        
    responses = data.get("responses", [])
    
    # Store responses
    for resp in responses:
        await db.assessmentresponse.create(
            data={
                "tenantId": session.tenantId,
                "assessmentSessionId": session.id,
                "fieldName": resp["fieldName"],
                "value": json.dumps(resp["value"]),
                "metadata": json.dumps(resp.get("metadata", {}))
            }
        )
        
    # Update session status
    await db.assessmentsession.update(
        where={"id": session.id},
        data={
            "status": "SUBMITTED",
            "submittedAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
    )
    
    # Generate Audit Log since BaseRepository is bypassed
    try:
        await db.auditlog.create(
            data={
                "tenantId": session.tenantId,
                "userId": session.createdBy,
                "action": "SUBMIT_PUBLIC_ASSESSMENT",
                "resource": "assessmentsession",
                "resourceId": session.id,
                "changes": json.dumps({"status": "SUBMITTED", "response_count": len(responses)}),
                "ipAddress": "PUBLIC"
            }
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to write public audit log: {e}")
        
    from infrastructure.redisCacheManager import cache_service
    await cache_service.invalidate_tags(session.tenantId, ["dashboard", "assessmentsession"])
    
    return {"message": "Responses submitted successfully"}

@router.post("/{token}/save-draft")
async def save_draft(token: str, data: dict, session = Depends(validate_assessment_token)):
    if session.status in ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail="Assessment already submitted")
        
    if session.status in ["CREATED", "SENT"]:
        await db.assessmentsession.update(
            where={"id": session.id},
            data={"status": "IN_PROGRESS", "updatedAt": datetime.now(timezone.utc)}
        )
        try:
            await db.auditlog.create(
                data={
                    "tenantId": session.tenantId,
                    "userId": session.createdBy,
                    "action": "SAVE_DRAFT_PUBLIC_ASSESSMENT",
                    "resource": "assessmentsession",
                    "resourceId": session.id,
                    "changes": json.dumps({"status": "IN_PROGRESS"}),
                    "ipAddress": "PUBLIC"
                }
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to write public draft audit log: {e}")
            
        from infrastructure.redisCacheManager import cache_service
        await cache_service.invalidate_tags(session.tenantId, ["dashboard", "assessmentsession"])
        
    return {"message": "Draft saved"}
