from database import db
from datetime import datetime, timezone
from typing import TypeVar, Generic, Optional, List, Dict, Any

class BaseRepository:
    """
    Base Repository enforcing soft-delete checks by default.
    """
    def __init__(self, model_name: str):
        # We fetch the prisma model dynamically (e.g. db.patient)
        self.model = getattr(db, model_name)
    
    async def find_unique(self, where: Dict[str, Any], include_deleted: bool = False, **kwargs):
        if not include_deleted:
            where["isDeleted"] = False
        return await self.model.find_first(where=where, **kwargs)

    async def find_first(self, where: Dict[str, Any], include_deleted: bool = False, **kwargs):
        if not include_deleted:
            where["isDeleted"] = False
        return await self.model.find_first(where=where, **kwargs)

    async def find_many(self, where: Optional[Dict[str, Any]] = None, include_deleted: bool = False, **kwargs):
        where = where or {}
        if not include_deleted:
            where["isDeleted"] = False
        return await self.model.find_many(where=where, **kwargs)

    async def create(self, data: Dict[str, Any], **kwargs):
        return await self.model.create(data=data, **kwargs)

    async def update(self, where: Dict[str, Any], data: Dict[str, Any], **kwargs):
        # Allow updating even soft-deleted items if necessary, but standard is not to.
        return await self.model.update_many(where=where, data=data, **kwargs)

    async def soft_delete(self, where: Dict[str, Any], deleted_by: str = "SYSTEM"):
        data = {
            "isDeleted": True,
            "deletedAt": datetime.now(timezone.utc),
            "deletedBy": deleted_by
        }
        return await self.model.update_many(where=where, data=data)

    async def restore(self, where: Dict[str, Any]):
        data = {
            "isDeleted": False,
            "deletedAt": None,
            "deletedBy": None
        }
        return await self.model.update_many(where=where, data=data)

    async def hard_delete(self, where: Dict[str, Any]):
        return await self.model.delete_many(where=where)
