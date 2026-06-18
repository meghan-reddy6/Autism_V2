from pydantic import BaseModel, Field, model_validator
from typing import List, Any, Optional, Dict
import hashlib
import uuid

class AssessmentResponseItem(BaseModel):
    fieldName: str
    value: int = Field(..., ge=1, le=5)
    metadata: Optional[Dict] = None

class PublicAssessmentIngestion(BaseModel):
    responses: List[AssessmentResponseItem]
    # Optionally accept ePHI like patientName, email, etc., that might be present in future public forms
    patientName: Optional[str] = None
    patientEmail: Optional[str] = None
    patientPhone: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_and_strip(self):
        # We don't remove them here because the prompt says:
        # "commits the full ePHI payload to the PostgreSQL database layer FIRST, 
        # and then outputs an explicitly stripped, anonymized payload object"
        return self

    def get_anonymized_payload(self, scale_type: str, age_months: int) -> dict:
        """
        Outputs an explicitly stripped, anonymized payload object to pass to the Arq background task queue.
        The ML payload must only contain numeric markers, age in months, and a secure temporary hash.
        """
        features = {}
        total_score = 0
        
        for r in self.responses:
            val = r.value
            score = 0
            
            # Numeric-only scoring logic
            if scale_type == "M-CHAT-R":
                # Reverse scoring: 2, 5, 12 are scored normally (Yes=1). Others reversed (No=1).
                if r.fieldName in ["mchat_2", "mchat_5", "mchat_12"]:
                    score = val
                else:
                    score = 1.0 - val
            else:
                score = val
                
            total_score += score
            features[r.fieldName] = score
            
        temp_hash = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()
        
        # Explicitly stripped payload: NO ePHI included!
        return {
            "scale_type": scale_type,
            "normalized_score": total_score,
            "age_months": age_months,
            "features": features,
            "temp_hash": temp_hash
        }
