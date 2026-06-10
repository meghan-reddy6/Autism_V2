from typing import Dict, Any, Optional
from .base_repo import BaseRepository
from core.context import get_tenant_id, get_user_role

class TenantAwareRepository(BaseRepository):
    """
    A repository that automatically intercepts all queries and injects
    the `tenantId` from the current request context.
    """
    
    def _inject_tenant(self, where: Dict[str, Any]) -> Dict[str, Any]:
        tenant_id = get_tenant_id()
        role = get_user_role()
        
        # Super Admins bypass tenant isolation when doing global operations
        if role == "SUPER_ADMIN":
            return where
            
        if not tenant_id:
            raise ValueError("Tenant context missing. Security violation. Cannot query tenant-scoped models outside of a tenant context.")
            
        where["tenantId"] = tenant_id
        return where

    async def find_unique(self, where: Dict[str, Any], include_deleted: bool = False, **kwargs):
        where = self._inject_tenant(where)
        return await super().find_unique(where, include_deleted, **kwargs)

    async def find_first(self, where: Dict[str, Any], include_deleted: bool = False, **kwargs):
        where = self._inject_tenant(where)
        return await super().find_first(where, include_deleted, **kwargs)

    async def find_many(self, where: Optional[Dict[str, Any]] = None, include_deleted: bool = False, **kwargs):
        where = where or {}
        where = self._inject_tenant(where)
        return await super().find_many(where, include_deleted, **kwargs)

    async def create(self, data: Dict[str, Any], tx: Optional[Any] = None, **kwargs):
        tenant_id = get_tenant_id()
        role = get_user_role()
        
        # Inject tenant_id into create data if not present and not SUPER_ADMIN
        if "tenantId" not in data and role != "SUPER_ADMIN":
            if not tenant_id:
                 raise ValueError("Tenant context missing on create. Security violation.")
            data["tenantId"] = tenant_id
            
        return await super().create(data, tx=tx)

    async def update(self, where: Dict[str, Any], data: Dict[str, Any], **kwargs):
        where = self._inject_tenant(where)
        return await super().update(where, data, **kwargs)

    async def soft_delete(self, where: Dict[str, Any], deleted_by: str = "SYSTEM"):
        where = self._inject_tenant(where)
        return await super().soft_delete(where, deleted_by)

    async def restore(self, where: Dict[str, Any]):
        where = self._inject_tenant(where)
        return await super().restore(where)

    async def hard_delete(self, where: Dict[str, Any]):
        where = self._inject_tenant(where)
        return await super().hard_delete(where)
