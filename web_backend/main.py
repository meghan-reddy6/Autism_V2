import httpx
import yaml
import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Clinical Web Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

with open("../config/scoring_thresholds.yaml", "r") as f:
    THRESHOLDS = yaml.safe_load(f)

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8001/analyze")

class AssessmentPayload(BaseModel):
    patient_id: str
    clinician_id: str
    patient_age_months: int
    scale_type: str
    item_scores: Dict[str, int]

def get_deterministic_risk(scale: str, score: float) -> str:
    scale_config = THRESHOLDS.get("scales", {}).get(scale)
    if not scale_config:
        return "Unknown Scale"
    for risk_level, (low, high) in scale_config.items():
        if low <= score <= high:
            return risk_level.replace("_", " ").title()
    return "Out of Range"

@app.post("/api/assessments/submit")
async def submit_assessment(payload: AssessmentPayload):
    total_score = sum(payload.item_scores.values())
    deterministic_result = get_deterministic_risk(payload.scale_type, total_score)
    
    anonymized_payload = {
        "scale_type": payload.scale_type,
        "normalized_score": total_score,
        "age_months": payload.patient_age_months
    }
    
    ml_result, ml_confidence, ml_status = None, None, "unavailable"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(ML_SERVICE_URL, json=anonymized_payload, timeout=3.0)
            response.raise_for_status()
            ml_data = response.json()
            ml_result = ml_data["risk_assessment"]
            ml_confidence = ml_data["confidence_score"]
            ml_status = "success"
    except httpx.RequestError as e:
        print(f"ML Service Error: {e}")
    
    return {
        "status": "Saved",
        "total_score": total_score,
        "deterministic_result": deterministic_result,
        "ml_inference": {
            "status": ml_status,
            "risk_assessment": ml_result,
            "confidence_score": ml_confidence
        }
    }