from database import db
from datetime import datetime, timezone
from typing import TypeVar, Generic, Optional, List, Dict, Any

class BaseRepository:
    """
    Base Repository enforcing soft-delete checks by default,
    with automatic Audit Trail logging.
    """
    def __init__(self, model_name: str, has_soft_delete: bool = True):
        self.model_name = model_name
        self.model = getattr(db, model_name)
        self.has_soft_delete = has_soft_delete
        
    async def _audit_log(self, action: str, before_state: Optional[Dict], after_state: Optional[Dict], changes: Optional[Dict], resource_id: str):
        from core.context import get_tenant_id, get_user_id, get_ip_address
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
