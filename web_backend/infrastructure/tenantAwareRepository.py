from database import db
from datetime import datetime, timezone
from typing import TypeVar, Generic, Optional, List, Dict, Any
from infrastructure.context import get_user_role, get_tenant_id, get_user_id, get_ip_address


class BaseRepository:
    """
    Base Repository enforcing soft-delete checks by default,
    with automatic Audit Trail logging.
    
    Security Assumptions:
    - This base class DOES NOT enforce tenant isolation. It must be subclassed 
      by `TenantAwareRepository` for models containing sensitive clinical data.
    - It assumes soft deletes are the primary deletion mechanism unless `hard_delete` is explicitly called.
    """
    def __init__(self, model_name: str, has_soft_delete: bool = True):
        self.model_name = model_name
        self.model = getattr(db, model_name)
        self.has_soft_delete = has_soft_delete
        
    async def _audit_log(self, action: str, before_state: Optional[Dict], after_state: Optional[Dict], changes: Optional[Dict], resource_id: str):
        """
        Automatically generates an immutable audit trail for destructive actions (CREATE, UPDATE, DELETE).
        
        Dependencies:
        - Relies on `infrastructure.context` to extract the active `tenant_id`, `user_id`, and `ip_address` 
          from the current request's ContextVars (populated by the JWT middleware).
          
        Failure Scenarios:
        - If the request is internal/system-level and lacks a `tenant_id` or `user_id`, the audit is silently skipped.
        - If serialization fails (e.g., complex datetime objects), the audit logs an error but DOES NOT crash 
          the primary database transaction. This ensures core functionality remains highly available.
        """
        from infrastructure.context import get_tenant_id, get_user_id, get_ip_address
        tenant_id = get_tenant_id()
        user_id = get_user_id()
        ip_address = get_ip_address()
        
        if not tenant_id or not user_id:
            return # Skip audit if not in an authenticated request context
            
        # Serialize datetime objects securely for JSON
        import json
        from datetime import datetime, date
        def json_serial(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            raise TypeError("Type not serializable")
        try:
            import json
            audit_data = {
                "tenantId": tenant_id,
                "userId": user_id,
                "action": action.upper(),
                "resource": self.model_name,
                "resourceId": resource_id,
                "changes": json.dumps(changes) if changes else "{}"
            }
            if before_state is not None:
                audit_data["beforeState"] = json.dumps(before_state, default=str)
            if after_state is not None:
                audit_data["afterState"] = json.dumps(after_state, default=str)
            if ip_address:
                audit_data["ipAddress"] = ip_address
                
            await db.auditlog.create(data=audit_data)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Audit log failed: {e}")
    
    async def find_unique(self, where: Dict[str, Any], include_deleted: bool = False, **kwargs):
        if self.has_soft_delete and not include_deleted:
            where["isDeleted"] = False
        return await self.model.find_first(where=where, **kwargs)

    async def find_first(self, where: Dict[str, Any], include_deleted: bool = False, **kwargs):
        if self.has_soft_delete and not include_deleted:
            where["isDeleted"] = False
        return await self.model.find_first(where=where, **kwargs)

    async def find_many(self, where: Optional[Dict[str, Any]] = None, include_deleted: bool = False, **kwargs):
        where = where or {}
        if self.has_soft_delete and not include_deleted:
            where["isDeleted"] = False
        return await self.model.find_many(where=where, **kwargs)

    async def count(self, where: Optional[Dict[str, Any]] = None, include_deleted: bool = False, **kwargs):
        where = where or {}
        if self.has_soft_delete and not include_deleted:
            where["isDeleted"] = False
        return await self.model.count(where=where, **kwargs)

    async def create(self, data: Dict[str, Any], tx: Optional[Any] = None):
        target_model = getattr(tx, self.model_name) if tx else self.model
        result = await target_model.create(data=data)
        
        # We assume the result has a model_dump method if it's a Prisma model
        a_dict = result.model_dump(mode='json') if hasattr(result, "model_dump") else result
        if isinstance(a_dict, dict):
            await self._audit_log("CREATE", None, a_dict, {"action": "create"}, a_dict.get("id", "unknown"))
            
        return result

    async def update(self, where: Dict[str, Any], data: Dict[str, Any], **kwargs):
        before_records = await self.model.find_many(where=where)
        result = await self.model.update_many(where=where, data=data, **kwargs)
        after_records = await self.model.find_many(where=where)
        
        for before, after in zip(before_records, after_records):
            b_dict = before.model_dump(mode='json') if hasattr(before, "model_dump") else before
            a_dict = after.model_dump(mode='json') if hasattr(after, "model_dump") else after
            if isinstance(b_dict, dict) and isinstance(a_dict, dict):
                changes = {k: a_dict[k] for k in a_dict if k in b_dict and b_dict[k] != a_dict[k]}
                await self._audit_log("UPDATE", b_dict, a_dict, changes, a_dict.get("id", "unknown"))
            
        return result

    async def soft_delete(self, where: Dict[str, Any], deleted_by: str = "SYSTEM"):
        if not self.has_soft_delete:
            raise NotImplementedError(f"Model {self.model_name} does not support soft delete")
            
        before_records = await self.model.find_many(where=where)
        data = {
            "isDeleted": True,
            "deletedAt": datetime.now(timezone.utc),
            "deletedBy": deleted_by
        }
        result = await self.model.update_many(where=where, data=data)
        after_records = await self.model.find_many(where=where)
        
        for before, after in zip(before_records, after_records):
            b_dict = before.model_dump(mode='json') if hasattr(before, "model_dump") else before
            a_dict = after.model_dump(mode='json') if hasattr(after, "model_dump") else after
            if isinstance(b_dict, dict) and isinstance(a_dict, dict):
                changes = {"isDeleted": True, "deletedBy": deleted_by}
                await self._audit_log("SOFT_DELETE", b_dict, a_dict, changes, a_dict.get("id", "unknown"))
                
        return result

    async def restore(self, where: Dict[str, Any]):
        if not self.has_soft_delete:
            raise NotImplementedError(f"Model {self.model_name} does not support soft delete")
            
        data = {
            "isDeleted": False,
            "deletedAt": None,
            "deletedBy": None
        }
        return await self.model.update_many(where=where, data=data)

    async def hard_delete(self, where: Dict[str, Any]):
        before_records = await self.model.find_many(where=where)
        result = await self.model.delete_many(where=where)
        for before in before_records:
            b_dict = before.model_dump(mode='json') if hasattr(before, "model_dump") else before
            if isinstance(b_dict, dict):
                await self._audit_log("HARD_DELETE", b_dict, None, {"action": "hard_delete"}, b_dict.get("id", "unknown"))
        return result

class TenantAwareRepository(BaseRepository):
    """
    A repository that strictly requires tenant_id for all queries to prevent cross-tenant data leakage.
    
    Tenant Isolation Rules:
    - EVERY read/write query MUST have `tenantId` forcibly injected into its `where` clause.
    - If `tenantId` is missing from the query context, the operation immediately throws a ValueError.
    
    Security Assumptions:
    - `SUPER_ADMIN` role bypasses all tenant isolation. This allows super administrators to run 
      global queries (e.g., generating system-wide analytics or modifying organization billing limits).
    - It assumes the underlying Prisma schema has a `tenantId` field on the target model.
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

    async def count(self, tenant_id: str, where: Optional[Dict[str, Any]] = None, include_deleted: bool = False, **kwargs):
        where = where or {}
        where = self._inject_tenant(tenant_id, where)
        return await super().count(where, include_deleted, **kwargs)

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

class ReportRepository(TenantAwareRepository):
    """
    Report-specific repository that enforces tenant isolation via the AssessmentSession relationship.
    
    Expected Behavior:
    - The `Report` model in Prisma does not have a direct `tenantId` column. Instead, it belongs to 
      an `AssessmentSession`, which holds the `tenantId`.
    - This repository overrides `_inject_tenant` to perform a relational query injection (`session: { is: { tenantId: ? } }`).
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

# Global instances previously exported from __init__.py
tenant_repo = TenantAwareRepository("organization")
user_repo = TenantAwareRepository("user")
patient_repo = TenantAwareRepository("patient")
appointment_repo = TenantAwareRepository("appointment")
assessment_repo = TenantAwareRepository("assessment")
assessment_session_repo = TenantAwareRepository("assessmentsession")
report_repo = ReportRepository("report")
report_section_repo = TenantAwareRepository("reportsection")
