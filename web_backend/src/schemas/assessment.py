from pydantic import BaseModel, Field, model_validator
from typing import List, Any, Optional, Dict
import hashlib
import uuid

class AssessmentResponseItem(BaseModel):
    fieldName: str
    value: Any
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
            # Basic deterministic scoring conversion for ML
            if scale_type == "CARS":
                if val == "Normal": score = 1
                elif val == "Mildly abnormal": score = 2
                elif val == "Moderately abnormal": score = 3
                elif val == "Severely abnormal": score = 4
                else: score = int(val) if isinstance(val, (int, str)) and str(val).isdigit() else 0
            elif scale_type == "M-CHAT-R":
                if r.fieldName in ["mchat_2", "mchat_5", "mchat_12"]:
                    if val == "Yes": score = 1
                else:
                    if val == "No": score = 1
            elif scale_type == "GARS-2":
                if val == "Never": score = 0
                elif val == "Seldom": score = 1
                elif val == "Sometimes": score = 2
                elif val == "Frequently": score = 3
                else: score = int(val) if isinstance(val, (int, str)) and str(val).isdigit() else 0
            else:
                score = int(val) if isinstance(val, (int, str)) and str(val).isdigit() else 0
                
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
