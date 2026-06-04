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
        "templateName": session.template.name if session.template else None,
        "schema": session.template.formSchema if session.template else None,
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
        
    return {"message": "Draft saved"}
