from fastapi import APIRouter, Depends
from typing import Any

from dependencies import get_current_user, require_roles
from services.dashboard_service import dashboard_service

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    return await dashboard_service.get_dashboard_stats(tenant_id=current_user.tenantId)
