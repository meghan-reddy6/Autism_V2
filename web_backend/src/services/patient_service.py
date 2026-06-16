import uuid
from typing import Dict, Any, List, Optional
from src.schemas.patient import PatientCreate
from src.repositories.tenant_aware_repository import TenantAwareRepository
from src.database import db
from src.infrastructure.events.events import event_bus, DomainEvent
from src.infrastructure.telemetry.request_context import get_tenant_id

class PatientService:
    def __init__(self):
        self.patient_repo = TenantAwareRepository("patient")
        self.assessment_repo = TenantAwareRepository("assessmentsession")

    async def _generate_mrn(self, tenant_id: str, attempt: int = 0) -> str:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        date_str = now.strftime("%d%m%Y")
        
        # Count existing MRNs for today to determine the sequence number
        count = await db.patient.count(where={
            "tenantId": tenant_id,
            "mrn": {"startsWith": date_str}
        })
        
        sequence = count + 1 + attempt
        return f"{date_str}{sequence:04d}"

    async def create_patient(self, patient_data: PatientCreate) -> Any:
        from prisma.errors import UniqueViolationError
        import logging
        
        data = patient_data.model_dump()
        tenant_id = get_tenant_id()
        if not tenant_id:
            raise ValueError("Tenant context missing")
            
        # Retry loop for MRN collisions
        max_retries = 3
        for attempt in range(max_retries):
            new_mrn = await self._generate_mrn(tenant_id, attempt)
            data["mrn"] = new_mrn
            try:
                # Use explicit transaction boundary to ensure atomicity and rollback on fail
                async with db.tx() as transaction:
                    tenant_id = get_tenant_id()
                    if not tenant_id:
                        raise ValueError("Tenant context missing")
                    result = await self.patient_repo.create(tenant_id=tenant_id, data=data, tx=transaction)
                    
                    # Publish durable domain event for patient creation
                    tenant_id = get_tenant_id()
                    if tenant_id:
                        event = DomainEvent(
                            event_type="PatientCreated",
                            tenant_id=tenant_id,
                            payload={"patient_id": result.id, "mrn": result.mrn}
                        )
                        await event_bus.publish(event)
                        
                    return result
            except UniqueViolationError:
                logging.getLogger(__name__).warning(f"MRN collision detected on attempt {attempt+1}. Retrying...")
                if attempt == max_retries - 1:
                    raise RuntimeError("Failed to generate a unique MRN after 3 attempts")
                continue

    async def list_patients(self) -> List[Any]:
        from src.infrastructure.telemetry.request_context import get_user_role, get_user_id
        tenant_id = get_tenant_id()
        role = get_user_role()
        
        where_clause = {}
        if role == "DOCTOR":
            where_clause["OR"] = [
                {"assignedDoctorId": get_user_id()},
                {"assignedDoctorId": None}
            ]
            
        return await self.patient_repo.find_many(
            tenant_id=tenant_id,
            where=where_clause,
            order={"createdAt": "desc"}
        )

    async def get_patient_with_summary(self, patient_id: str) -> Optional[Dict[str, Any]]:
        tenant_id = get_tenant_id()
        from src.infrastructure.telemetry.request_context import get_user_role, get_user_id
        role = get_user_role()
        where_clause = {"id": patient_id}
        if role == "DOCTOR":
            where_clause["OR"] = [
                {"assignedDoctorId": get_user_id()},
                {"assignedDoctorId": None}
            ]
            
        patient = await self.patient_repo.find_first(
            tenant_id=tenant_id,
            where=where_clause,
            include={
                "assessmentSessions": {
                    "include": {"reports": True}
                },
                "clinicalNotes": True
            }
        )
        if not patient:
            return None
            
        patient_dict = patient.model_dump() if hasattr(patient, "model_dump") else patient
        if isinstance(patient_dict, dict):
            patient_dict["clinicalNotesCount"] = len(patient_dict.get("clinicalNotes", []))
            return patient_dict
        return patient
        
    async def get_patient_assessments(self, patient_id: str) -> Optional[List[Any]]:
        tenant_id = get_tenant_id()
        from src.infrastructure.telemetry.request_context import get_user_role, get_user_id
        role = get_user_role()
        where_clause = {"id": patient_id}
        if role == "DOCTOR":
            where_clause["OR"] = [
                {"assignedDoctorId": get_user_id()},
                {"assignedDoctorId": None}
            ]
            
        patient = await self.patient_repo.find_first(tenant_id=tenant_id, where=where_clause)
        if not patient:
            return None
            
        sessions = await self.assessment_repo.find_many(
            tenant_id=tenant_id,
            where={"patientId": patient_id},
            include={
                "reports": True
            },
            order={"createdAt": "desc"}
        )
        return sessions

patient_service = PatientService()
