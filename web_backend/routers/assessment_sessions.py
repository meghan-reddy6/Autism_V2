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

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8001/analyze")

router = APIRouter(
    prefix="/api/v1/assessment-sessions",
    tags=["Assessment Sessions"],
    dependencies=[Depends(get_current_user)]
)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(session_data: dict, current_user = Depends(get_current_user)):
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
    
    return {"id": session.id, "token": token, "message": "Assessment session created"}

@router.get("/{session_id}")
async def get_session(session_id: str, current_user = Depends(get_current_user)):
    session = await db.assessmentsession.find_unique(
        where={"id": session_id},
        include={"template": True, "patient": True, "responses": True, "reports": True}
    )
    if not session or session.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("")
async def list_sessions(patientId: Optional[str] = None, status: Optional[str] = None, current_user = Depends(get_current_user)):
    where_clause = {"tenantId": current_user.tenantId}
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
async def update_status(session_id: str, status_data: dict, current_user = Depends(get_current_user)):
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
    return updated

@router.post("/{session_id}/score")
async def generate_report(session_id: str, current_user = Depends(get_current_user)):
    session = await db.assessmentsession.find_unique(
        where={"id": session_id},
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
            "assessmentSessionId": session_id,
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
        where={"id": session_id},
        data={"status": "UNDER_REVIEW"}
    )
    
    # Audit log
    await db.auditlog.create(data={
        "tenantId": current_user.tenantId,
        "userId": current_user.id,
        "action": "CREATE_REPORT",
        "resource": "Report",
        "resourceId": report.id
    })
    
    return report
