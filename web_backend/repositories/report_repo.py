from typing import Dict, Any, Optional
from .tenant_repo import TenantAwareRepository
from core.context import get_user_role

class ReportRepository(TenantAwareRepository):
    """
    Report-specific repository that enforces tenant isolation via the AssessmentSession relationship.
    """
    
    def _inject_tenant(self, tenant_id: str, where: Dict[str, Any]) -> Dict[str, Any]:
        role = get_user_role()
        if role == "SUPER_ADMIN":
            return where
            
        if not tenant_id:
            raise ValueError("Tenant context missing. Security violation.")
            
        # If session is already in where, we need to merge it carefully
        if "session" in where:
            if "is" in where["session"]:
                where["session"]["is"]["tenantId"] = tenant_id
            else:
                where["session"]["is"] = {"tenantId": tenant_id}
        else:
            where["session"] = {"is": {"tenantId": tenant_id}}
            
        return where
