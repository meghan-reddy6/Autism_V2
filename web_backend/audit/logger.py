from fastapi import Request
import logging

logger = logging.getLogger(__name__)

async def log_audit(
    user_id: str,
    tenant_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    request: Request = None,
    details: dict = None
):
    """
    Standardized asynchronous audit logger.
    Captures action context and IP address for HIPAA compliance tracking.
    """
    from database import db
    
    ip_address = None
    if request:
        # Check standard headers for IP if behind proxy
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip_address = forwarded.split(",")[0]
        else:
            ip_address = request.client.host if request.client else None

    try:
        await db.auditlog.create(
            data={
                "tenantId": tenant_id,
                "userId": user_id,
                "action": action,
                "resource": resource_type,
                "resourceId": resource_id,
                "ipAddress": ip_address
            }
        )
    except Exception as e:
        # We should not fail the main request if audit logging fails, but we MUST alert it
        logger.error(f"CRITICAL: Failed to write audit log! {str(e)}")
