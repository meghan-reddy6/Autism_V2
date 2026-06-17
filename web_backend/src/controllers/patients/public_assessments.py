from fastapi import APIRouter, Depends, HTTPException, status
from src.api.dependencies import validate_assessment_token
from src.database import db
from datetime import datetime, timezone
import json
from src.schemas.assessment import PublicAssessmentIngestion

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
async def submit_responses(token: str, data: PublicAssessmentIngestion, session = Depends(validate_assessment_token)):
    if session.status in ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ARCHIVED"]:
        raise HTTPException(status_code=400, detail="Assessment already submitted")
        
    # Commit the full ePHI payload to the PostgreSQL database layer FIRST
    response_records = [
        {
            "tenantId": session.tenantId,
            "assessmentSessionId": session.id,
            "fieldName": resp.fieldName,
            "value": json.dumps(resp.value),
            "metadata": json.dumps(resp.metadata) if resp.metadata else "{}"
        }
        for resp in data.responses
    ]
    await db.assessmentresponse.create_many(data=response_records)
        
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
                "changes": json.dumps({"status": "SUBMITTED", "response_count": len(data.responses)}),
                "ipAddress": "PUBLIC"
            }
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to write public audit log: {e}")
        
    from src.infrastructure.cache.redis_cache_manager import cache_service
    await cache_service.invalidate_tags(session.tenantId, ["dashboard", "assessmentsession"])
    
    # Calculate age_months for anonymized payload
    dob = session.patient.dateOfBirth
    now = datetime.now(timezone.utc)
    if dob.tzinfo is None:
        dob = dob.replace(tzinfo=timezone.utc)
    age_months = (now.year - dob.year) * 12 + now.month - dob.month
    if now.day < dob.day:
        age_months -= 1

    # Output an explicitly stripped, anonymized payload object
    anonymized_payload = data.get_anonymized_payload(session.scaleType, age_months)
    
    # Pass out-of-band to ML service via Arq queue
    try:
        from src.infrastructure.jobs.worker import enqueue_ml_scoring
        await enqueue_ml_scoring(anonymized_payload, session.id, session.tenantId, session.createdBy)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to enqueue ML scoring task: {e}")
    
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
            
        from src.infrastructure.cache.redis_cache_manager import cache_service
        await cache_service.invalidate_tags(session.tenantId, ["dashboard", "assessmentsession"])
        
    return {"message": "Draft saved"}
