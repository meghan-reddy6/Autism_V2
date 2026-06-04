from .base_repo import BaseRepository
from typing import Dict, Any, Optional

class PatientRepository(BaseRepository):
    def __init__(self):
        super().__init__("patient")

    async def find_by_mrn(self, mrn: str, tenantId: str, include_deleted: bool = False):
        where = {"mrn": mrn, "tenantId": tenantId}
        return await self.find_first(where, include_deleted=include_deleted)

patient_repo = PatientRepository()
