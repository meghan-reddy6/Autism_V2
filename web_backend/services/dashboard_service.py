from typing import Any, Dict
from datetime import datetime, timedelta
from database import db
from services.cache_service import coalesce
from services.cache_key_builder import CacheKeyBuilder
from core.cache_config import CacheConfig, CacheConsistencyLevel

class DashboardService:
    @staticmethod
    @coalesce(key_builder=CacheKeyBuilder.build_dashboard_stats_key, tags=["dashboard"], ttl=3600)
    async def get_dashboard_stats(tenant_id: str) -> Dict[str, Any]:
        # Compute Stats (The decorator handles checking Cache + DB + Set)
        total_patients = await db.patient.count(where={"tenantId": tenant_id})
        
        pending_assessments = await db.assessmentsession.count(where={
            "tenantId": tenant_id,
            "status": {"in": ["SUBMITTED", "UNDER_REVIEW"]}
        })
        
        # We'll use Reports for high risk alerts, or fallback to 0 if not implemented yet
        high_risk_alerts = await db.assessment.count(where={
            "tenantId": tenant_id,
            "predictedRisk": "High"
        })
        
        week_ago = datetime.now() - timedelta(days=7)
        weekly_consults = await db.appointment.count(where={
            "tenantId": tenant_id,
            "scheduledAt": {"gte": week_ago}
        })
        
        recent_sessions = await db.assessmentsession.find_many(
            where={"tenantId": tenant_id},
            include={"patient": True, "template": True},
            order={"createdAt": "desc"},
            take=5
        )
        
        recent_activity = []
        for s in recent_sessions:
            recent_activity.append({
                "id": s.id,
                "type": "Assessment Session",
                "patient": f"{s.patient.firstName} {s.patient.lastName[0]}. ({s.patient.mrn})",
                "action": f"{s.template.name if s.template else 'Assessment'} - {s.status}",
                "risk": "N/A", # Wait for report to determine risk
                "time": s.createdAt.strftime("%Y-%m-%d %H:%M")
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

dashboard_service = DashboardService()
