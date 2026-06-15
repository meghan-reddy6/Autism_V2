from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
import httpx
import os
from prisma import Json

from database import db
from dependencies import get_current_user, require_roles
from infrastructure.tenantAwareRepository import assessment_repo, patient_repo
from domains.patients.queries import get_assessment_or_404

router = APIRouter(prefix="/api/v1/assessments", tags=["assessments"])

from domains.patients.ml_client import fetch_ml_metadata

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
    assessments = await assessment_repo.find_many(
        tenant_id=current_user.tenantId,
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
    assessment = await get_assessment_or_404(current_user.tenantId, assessment_id, include_patient=True)
    return assessment

@router.post("/score")
async def score_assessment(
    payload: AssessmentPayload,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    patient = await patient_repo.get_by_id(
        tenant_id=current_user.tenantId,
        id=payload.patientId
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
    
    ml_metadata = await fetch_ml_metadata(ml_payload)

    assessment = await assessment_repo.create(
        tenant_id=current_user.tenantId,
        data={
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
        }
    )
    
    # Audit log
    from audit.logger import log_audit
    from fastapi import Request
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="CREATE_ASSESSMENT",
        resource_type="Assessment",
        resource_id=assessment.id
    )
    
    return assessment

@router.get("/{assessment_id}/cdss-recommendations")
async def get_cdss_recommendations(
    assessment_id: str,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    assessment = await get_assessment_or_404(current_user.tenantId, assessment_id)
        
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
    from audit.logger import log_audit
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="VIEW_CDSS_RECOMMENDATIONS",
        resource_type="Assessment",
        resource_id=assessment.id
    )
        
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
    assessment = await get_assessment_or_404(current_user.tenantId, assessment_id)
        
    updated_assessment = await assessment_repo.update(
        tenant_id=current_user.tenantId,
        where={"id": assessment_id},
        data={"status": "REVIEWED"}
    )
    
    from audit.logger import log_audit
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="SUBMIT_ML_FEEDBACK",
        resource_type="Assessment",
        resource_id=assessment.id,
        details=f"Agreement: {payload.doctor_agreement}, Notes: {payload.doctor_notes}"
    )
    
    return updated_assessment
