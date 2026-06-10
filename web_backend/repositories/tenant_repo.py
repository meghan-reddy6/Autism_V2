from typing import Dict, Any, Optional
from .base_repo import BaseRepository
from core.context import get_user_role

class TenantAwareRepository(BaseRepository):
    """
    A repository that strictly requires tenant_id for all queries to prevent cross-tenant data leakage.
    """
    
    def _inject_tenant(self, tenant_id: str, where: Dict[str, Any]) -> Dict[str, Any]:
        role = get_user_role()
        
        # Super Admins bypass tenant isolation when doing global operations
        if role == "SUPER_ADMIN":
            return where
            
        if not tenant_id:
            raise ValueError("Tenant context missing. Security violation. Cannot query tenant-scoped models without an explicit tenant_id.")
            
        where["tenantId"] = tenant_id
        return where

    async def get_by_id(self, tenant_id: str, id: str, include_deleted: bool = False, **kwargs):
        where = {"id": id}
        where = self._inject_tenant(tenant_id, where)
        return await super().find_unique(where, include_deleted, **kwargs)

    async def find_unique(self, tenant_id: str, where: Dict[str, Any], include_deleted: bool = False, **kwargs):
        where = self._inject_tenant(tenant_id, where)
        return await super().find_unique(where, include_deleted, **kwargs)

    async def find_first(self, tenant_id: str, where: Dict[str, Any], include_deleted: bool = False, **kwargs):
        where = self._inject_tenant(tenant_id, where)
        return await super().find_first(where, include_deleted, **kwargs)

    async def find_many(self, tenant_id: str, where: Optional[Dict[str, Any]] = None, include_deleted: bool = False, **kwargs):
        where = where or {}
        where = self._inject_tenant(tenant_id, where)
        return await super().find_many(where, include_deleted, **kwargs)

    async def create(self, tenant_id: str, data: Dict[str, Any], tx: Optional[Any] = None, **kwargs):
        role = get_user_role()
        
        # Inject tenant_id into create data if not present and not SUPER_ADMIN
        if "tenantId" not in data and role != "SUPER_ADMIN":
            if not tenant_id:
                 raise ValueError("Tenant context missing on create. Security violation.")
            data["tenantId"] = tenant_id
            
        return await super().create(data, tx=tx)

    async def update(self, tenant_id: str, where: Dict[str, Any], data: Dict[str, Any], **kwargs):
        where = self._inject_tenant(tenant_id, where)
        return await super().update(where, data, **kwargs)

    async def soft_delete(self, tenant_id: str, where: Dict[str, Any], deleted_by: str = "SYSTEM"):
        where = self._inject_tenant(tenant_id, where)
        return await super().soft_delete(where, deleted_by)

    async def restore(self, tenant_id: str, where: Dict[str, Any]):
        where = self._inject_tenant(tenant_id, where)
        return await super().restore(where)

    async def hard_delete(self, tenant_id: str, where: Dict[str, Any]):
        where = self._inject_tenant(tenant_id, where)
        return await super().hard_delete(where)
