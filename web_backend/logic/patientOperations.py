import uuid
from typing import Dict, Any, List, Optional
from schemas.patient import PatientCreate
from infrastructure.tenantAwareRepository import TenantAwareRepository
from database import db
from infrastructure.events import event_bus, DomainEvent
from infrastructure.context import get_tenant_id

class PatientService:
    def __init__(self):
        self.patient_repo = TenantAwareRepository("patient")
        self.assessment_repo = TenantAwareRepository("assessmentsession")

    def _generate_mrn(self) -> str:
        # Generates a pseudo-random MRN
        return f"MRN-{uuid.uuid4().hex[:8].upper()}"

    async def create_patient(self, patient_data: PatientCreate) -> Any:
        from prisma.errors import UniqueViolationError
        import logging
        
        data = patient_data.model_dump()
        
        # Retry loop for MRN collisions
        max_retries = 3
        for attempt in range(max_retries):
            new_mrn = self._generate_mrn()
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
        from infrastructure.context import get_user_role, get_user_id
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
        from infrastructure.context import get_user_role, get_user_id
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
        from infrastructure.context import get_user_role, get_user_id
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
