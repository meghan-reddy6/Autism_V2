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
        
        pending_assessments = await db.assessment.count(where={
            "tenantId": tenant_id,
            "status": "DRAFT"
        })
        
        high_risk_alerts = await db.assessment.count(where={
            "tenantId": tenant_id,
            "predictedRisk": "High"
        })
        
        week_ago = datetime.now() - timedelta(days=7)
        weekly_consults = await db.appointment.count(where={
            "tenantId": tenant_id,
            "scheduledAt": {"gte": week_ago}
        })
        
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
