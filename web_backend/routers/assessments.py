from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
import httpx
import os
from prisma import Json

from database import db
from dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/v1/assessments", tags=["assessments"])

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8001/analyze")

class AssessmentPayload(BaseModel):
    patientId: str
    scaleType: str
    itemScores: Dict[str, int]
    medicalHistory: Optional[str] = None
    lifestyleInfo: Optional[str] = None
    symptoms: Optional[Any] = None

@router.get("")
async def list_assessments(
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    assessments = await db.assessment.find_many(
        where={
            "tenantId": current_user.tenantId
        },
        include={
            "patient": True
        },
        order={
            "createdAt": "desc"
        }
    )
    return assessments
    
@router.get("/{assessment_id}")
async def get_assessment(
    assessment_id: str,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    assessment = await db.assessment.find_first(
        where={
            "id": assessment_id,
            "tenantId": current_user.tenantId
        },
        include={
            "patient": True
        }
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment

@router.post("/score")
async def score_assessment(
    payload: AssessmentPayload,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    patient = await db.patient.find_first(
        where={
            "id": payload.patientId,
            "tenantId": current_user.tenantId
        }
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    total_score = sum(payload.itemScores.values())
    
    # Calculate age in months for ML model if needed
    # For now, pass a dummy or calculated value
    age_months = 36 # Placeholder
    
    ml_payload = {
        "scale_type": payload.scaleType,
        "normalized_score": total_score,
        "age_months": age_months,
        "features": payload.itemScores # Pass raw features for SHAP explainability
    }
    
    ml_metadata = {"status": "unavailable"}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(ML_SERVICE_URL, json=ml_payload, timeout=5.0)
            if response.status_code == 200:
                ml_metadata = response.json()
    except Exception as e:
        print(f"ML Warning: {e}")

    assessment = await db.assessment.create(data={
        "tenantId": current_user.tenantId,
        "patientId": patient.id,
        "scaleType": payload.scaleType,
        "itemScores": Json(payload.itemScores),
        "totalScore": total_score,
        "predictedRisk": ml_metadata.get("risk_level"),
        "confidence": ml_metadata.get("confidence_score"),
        "shapValues": Json(ml_metadata.get("shap_breakdown", {})),
        "trajectory": Json(ml_metadata.get("trajectory_forecast", [])),
        "medicalHistory": payload.medicalHistory,
        "lifestyleInfo": payload.lifestyleInfo,
        "symptoms": Json(payload.symptoms) if payload.symptoms else None,
        "status": "FINALIZED"
    })
    
    # Audit log
    await db.auditlog.create(data={
        "tenantId": current_user.tenantId,
        "userId": current_user.id,
        "action": "CREATE_ASSESSMENT",
        "resource": "Assessment",
        "resourceId": assessment.id
    })
    
    return assessment

@router.get("/{assessment_id}/cdss-recommendations")
async def get_cdss_recommendations(
    assessment_id: str,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    assessment = await db.assessment.find_first(
        where={
            "id": assessment_id,
            "tenantId": current_user.tenantId
        }
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    # Hybrid rule-based CDSS logic based on risk level
    recommendations = []
    
    risk = assessment.predictedRisk or "Low"
    if risk in ["High", "Very High"]:
        recommendations.append({
            "type": "Therapy",
            "description": "Immediate referral for intensive behavioral therapy (ABA).",
            "priority": "Critical"
        })
        recommendations.append({
            "type": "Follow-up",
            "description": "Schedule follow-up assessment in 3 months.",
            "priority": "High"
        })
    elif risk == "Moderate":
        recommendations.append({
            "type": "Therapy",
            "description": "Consider speech or occupational therapy evaluation.",
            "priority": "Medium"
        })
    else:
        recommendations.append({
            "type": "Monitoring",
            "description": "Routine developmental monitoring.",
            "priority": "Low"
        })
        
    # Audit log
    await db.auditlog.create(data={
        "tenantId": current_user.tenantId,
        "userId": current_user.id,
        "action": "VIEW_CDSS_RECOMMENDATIONS",
        "resource": "Assessment",
        "resourceId": assessment.id
    })
        
    return {"assessmentId": assessment.id, "recommendations": recommendations}

class FeedbackPayload(BaseModel):
    doctor_agreement: bool
    doctor_notes: Optional[str] = ""

@router.post("/{assessment_id}/feedback")
async def submit_feedback(
    assessment_id: str,
    payload: FeedbackPayload,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    assessment = await db.assessment.find_first(
        where={
            "id": assessment_id,
            "tenantId": current_user.tenantId
        }
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    updated_assessment = await db.assessment.update(
        where={"id": assessment_id},
        data={"status": "REVIEWED"}
    )
    
    await db.auditlog.create(data={
        "tenantId": current_user.tenantId,
        "userId": current_user.id,
        "action": "SUBMIT_ML_FEEDBACK",
        "resource": "Assessment",
        "resourceId": assessment.id,
        "details": f"Agreement: {payload.doctor_agreement}, Notes: {payload.doctor_notes}"
    })
    
    return updated_assessment
