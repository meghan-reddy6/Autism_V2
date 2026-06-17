import os
import logging
from arq import create_pool
from arq.connections import RedisSettings
from datetime import datetime, timezone
from src.database import db
from prisma import Json

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Parse redis URL
redis_host = "localhost"
redis_port = 6379
redis_db = 0
if "redis://" in REDIS_URL:
    parts = REDIS_URL.split("redis://")[1].split("/")
    host_port = parts[0].split(":")
    redis_host = host_port[0]
    redis_port = int(host_port[1]) if len(host_port) > 1 else 6379
    redis_db = int(parts[1]) if len(parts) > 1 else 0

redis_settings = RedisSettings(host=redis_host, port=redis_port, database=redis_db)

async def process_ml_scoring(ctx, ml_payload: dict, session_id: str, tenant_id: str, user_id: str):
    """
    Background worker task to fetch ML scoring and generate a report.
    """
    from src.controllers.patients.cdss_ml_client import fetch_ml_metadata
    from src.database import db
    from src.repositories.tenant_aware_repository import report_repo, assessment_session_repo
    
    try:
        # The ml_payload is already explicitly stripped of ePHI
        ml_metadata = await fetch_ml_metadata(ml_payload)
        
        # Create Report
        report = await report_repo.create(
            tenant_id=tenant_id,
            data={
                "assessmentSessionId": session_id,
                "status": "AI_GENERATED",
                "sections": Json({
                    "scaleType": ml_payload.get("scale_type"),
                    "totalScore": ml_payload.get("normalized_score"),
                    "predictedRisk": ml_metadata.get("risk_level"),
                    "confidence": ml_metadata.get("confidence_score"),
                    "shapValues": ml_metadata.get("shap_breakdown", {}),
                    "itemScores": ml_payload.get("features", {})
                })
            }
        )
        
        # Update Session to UNDER_REVIEW
        await assessment_session_repo.update(
            tenant_id=tenant_id,
            where={"id": session_id},
            data={"status": "UNDER_REVIEW", "updatedAt": datetime.now(timezone.utc)}
        )
        
        # Audit Logging
        await db.auditlog.create(
            data={
                "tenantId": tenant_id,
                "userId": user_id,
                "action": "GENERATE_REPORT_ASYNC",
                "resource": "Report",
                "resourceId": report.id,
                "changes": "{}",
                "ipAddress": "SYSTEM"
            }
        )
        return True
    except Exception as e:
        logging.error(f"Failed to process ML scoring asynchronously: {e}")
        return False

async def startup(ctx):
    from src.database import db
    await db.connect()

async def shutdown(ctx):
    from src.database import db
    await db.disconnect()

class WorkerSettings:
    functions = [process_ml_scoring]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = redis_settings

_redis_pool = None

async def get_redis_pool():
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = await create_pool(redis_settings)
    return _redis_pool

async def enqueue_ml_scoring(ml_payload: dict, session_id: str, tenant_id: str, user_id: str):
    """
    Enqueues the ML scoring task.
    """
    pool = await get_redis_pool()
    job = await pool.enqueue_job('process_ml_scoring', ml_payload, session_id, tenant_id, user_id)
    return job.job_id if job else None
