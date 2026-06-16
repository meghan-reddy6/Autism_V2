from fastapi import APIRouter, Depends, HTTPException, status
from src.api.dependencies import get_current_user, require_roles
from src.repositories.tenant_aware_repository import tenant_repo, user_repo
from typing import Any

router = APIRouter(
    prefix="/api/v1/super-admin",
    tags=["Super Admin"],
    dependencies=[Depends(require_roles("SUPER_ADMIN"))]
)

@router.get("/system/health")
async def get_system_health():
    """Returns overall platform metrics"""
    # Simple mock check for now
    return {
        "status": "healthy",
        "database": "connected",
        "version": "3.0.0"
    }

@router.get("/tenants")
async def list_tenants():
    # Return all tenants, including soft deleted if needed, but standard is active
    tenants = await tenant_repo.find_many(include_deleted=True)
    return {"tenants": tenants}

@router.post("/tenants/{tenant_id}/suspend")
async def suspend_tenant(tenant_id: str, current_user: Any = Depends(get_current_user)):
    # Soft delete the tenant (acts as suspend)
    await tenant_repo.soft_delete({"id": tenant_id}, deleted_by=current_user.id)
    return {"message": f"Tenant {tenant_id} suspended"}

@router.post("/tenants/{tenant_id}/reactivate")
async def reactivate_tenant(tenant_id: str):
    await tenant_repo.restore({"id": tenant_id})
    return {"message": f"Tenant {tenant_id} reactivated"}

@router.post("/users/bulk-action")
async def bulk_user_action(payload: dict, current_user: Any = Depends(get_current_user)):
    """
    Expects:
    {
       "action": "deactivate" | "activate",
       "userIds": ["id1", "id2"]
    }
    """
    action = payload.get("action")
    user_ids = payload.get("userIds", [])
    
    if action == "deactivate":
        for uid in user_ids:
            await user_repo.update({"id": uid}, {"isActive": False})
    elif action == "activate":
        for uid in user_ids:
            await user_repo.update({"id": uid}, {"isActive": True})
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    from src.infrastructure.audit.audit_logger import log_audit
    from fastapi import Request
    import asyncio
    
    # Non-blocking fire-and-forget audit log
    async def _log_bulk():
        try:
            await log_audit(
                user_id=current_user.id,
                tenant_id=current_user.tenantId,
                action=f"BULK_USER_{action.upper()}",
                resource_type="User",
                resource_id="multiple",
                details=f"Affected users: {', '.join(user_ids)}"
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to write bulk audit log: {e}")
            
    asyncio.create_task(_log_bulk())
        
    return {"message": f"Bulk {action} completed on {len(user_ids)} users"}
