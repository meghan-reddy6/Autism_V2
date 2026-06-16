from fastapi import APIRouter, Depends
from typing import Any

from dependencies import get_current_user, require_roles
from database import db
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "ORG_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    tenant_id = current_user.tenantId
    from infrastructure.tenantAwareRepository import patient_repo, assessment_session_repo, assessment_repo, appointment_repo
    
    total_patients = await patient_repo.count(tenant_id=tenant_id)
    pending_assessments = await assessment_session_repo.count(tenant_id=tenant_id, where={
        "status": {"in": ["SUBMITTED", "UNDER_REVIEW"]}
    })
    
    high_risk_alerts = await assessment_repo.count(tenant_id=tenant_id, where={
        "predictedRisk": "High"
    })
    
    week_ago = datetime.now() - timedelta(days=7)
    weekly_consults = await appointment_repo.count(tenant_id=tenant_id, where={
        "scheduledAt": {"gte": week_ago}
    })
    
    recent_sessions = await assessment_session_repo.find_many(
        tenant_id=tenant_id,
        include={"patient": True},
        order={"createdAt": "desc"},
        take=5
    )
    
    recent_activity = []
    for s in recent_sessions:
        recent_activity.append({
            "id": s.id,
            "type": "Assessment Session",
            "patient": f"{s.patient.firstName} {s.patient.lastName[0]}. ({s.patient.mrn})",
            "action": f"{s.scaleType} - {s.status}",
            "risk": "N/A",
            "time": s.createdAt.isoformat() if s.createdAt else None
        })
        
    stats = {
        "summary": [
            {"title": "Total Active Patients", "value": str(total_patients), "trend": "N/A", "alert": False},
            {"title": "Pending Assessments", "value": str(pending_assessments), "trend": "N/A", "alert": False},
            {"title": "High-Risk Alerts", "value": str(high_risk_alerts), "trend": "N/A", "alert": high_risk_alerts > 0},
            {"title": "Weekly Consultations", "value": str(weekly_consults), "trend": "N/A", "alert": False},
        ],
        "recent_activity": recent_activity
    }
    
    return stats
