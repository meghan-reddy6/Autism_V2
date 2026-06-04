from fastapi import APIRouter, Depends
from typing import Any
from datetime import datetime, timedelta

from database import db
from dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    tenant_id = current_user.tenantId
    
    # Total Active Patients
    total_patients = await db.patient.count(where={"tenantId": tenant_id})
    
    # Pending Assessments (Assessments in DRAFT status)
    pending_assessments = await db.assessment.count(where={
        "tenantId": tenant_id,
        "status": "DRAFT"
    })
    
    # High-Risk Alerts (Assessments with predictedRisk == "High")
    high_risk_alerts = await db.assessment.count(where={
        "tenantId": tenant_id,
        "predictedRisk": "High"
    })
    
    # Consultations (Appointments this week)
    week_ago = datetime.now() - timedelta(days=7)
    weekly_consults = await db.appointment.count(where={
        "tenantId": tenant_id,
        "scheduledAt": {"gte": week_ago}
    })
    
    # Recent Activity (Merge recent assessments and notes)
    # For MVP, just pull recent assessments as "activity"
    recent_assessments = await db.assessment.find_many(
        where={"tenantId": tenant_id},
        include={"patient": True},
        order={"createdAt": "desc"},
        take=5
    )
    
    recent_activity = []
    for a in recent_assessments:
        recent_activity.append({
            "id": a.id,
            "type": "Assessment",
            "patient": f"{a.patient.firstName} {a.patient.lastName[0]}. ({a.patient.mrn})",
            "action": f"{a.scaleType} Assessment completed",
            "risk": a.predictedRisk,
            "time": a.createdAt.strftime("%Y-%m-%d %H:%M")
        })
        
    return {
        "summary": [
            {"title": "Total Active Patients", "value": str(total_patients), "trend": "N/A", "alert": False},
            {"title": "Pending Assessments", "value": str(pending_assessments), "trend": "N/A", "alert": False},
            {"title": "High-Risk Alerts", "value": str(high_risk_alerts), "trend": "N/A", "alert": high_risk_alerts > 0},
            {"title": "Weekly Consultations", "value": str(weekly_consults), "trend": "N/A", "alert": False},
        ],
        "recent_activity": recent_activity
    }
