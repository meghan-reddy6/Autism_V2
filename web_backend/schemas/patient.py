from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any

class PatientCreate(BaseModel):
    firstName: str
    lastName: str
    dateOfBirth: datetime
    gender: str
    guardianName: Optional[str] = None
    guardianEmail: Optional[str] = None
    guardianPhone: Optional[str] = None
    emergencyContact: Optional[str] = None
    address: Optional[str] = None
    referringPhysician: Optional[str] = None

class PatientSummaryResponse(BaseModel):
    id: str
    mrn: str
    firstName: str
    lastName: str
    dateOfBirth: datetime
    gender: str
    clinicalNotesCount: int = 0
    # Allow extra fields for dynamic mapping
    model_config = ConfigDict(extra='allow')
