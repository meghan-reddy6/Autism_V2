import httpx
import os
import time
from typing import Dict, Any

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001/analyze")

import logging
logger = logging.getLogger(__name__)

from src.infrastructure.telemetry.request_context import get_trace_id

class CircuitBreaker:
    def __init__(self, failure_threshold=3, recovery_timeout=30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = 0

    def allow_request(self) -> bool:
        if self.state == "CLOSED":
            return True
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
                return True
            return False
        if self.state == "HALF_OPEN":
            return True
        return False

    def record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

cb = CircuitBreaker()

def deterministic_fallback(payload: dict) -> dict:
    score = payload.get("normalized_score", 0)
    scale_type = payload.get("scale_type", "")
    risk_level = "Medium"
    
    if scale_type == "CARS":
        if score < 30: risk_level = "Non-Autistic"
        elif score < 37: risk_level = "Mild-Moderate Autism"
        else: risk_level = "Severe Autism"
    elif scale_type == "M-CHAT-R":
        if score < 3: risk_level = "Low Risk"
        elif score < 8: risk_level = "Medium / Moderate Risk"
        else: risk_level = "High Risk"
    elif scale_type == "GARS-2":
        if score < 70: risk_level = "Low / Unlikely"
        elif score < 85: risk_level = "Moderate / Possible"
        else: risk_level = "High Probability"
    elif scale_type == "ISAA":
        if score < 70: risk_level = "Normal / No Autism"
        elif score < 107: risk_level = "Mild Autism"
        elif score < 154: risk_level = "Moderate Autism"
        else: risk_level = "Severe Autism"
        
    return {
        "status": "fallback",
        "risk_level": risk_level,
        "confidence_score": 0.5, # Reduced confidence for deterministic fallback
        "shap_breakdown": {}
    }

async def fetch_ml_metadata(ml_payload: Dict[str, Any]) -> Dict[str, Any]:
    if not cb.allow_request():
        logger.warning("Circuit Breaker OPEN. Using deterministic fallback.")
        return deterministic_fallback(ml_payload)
        
    try:
        ml_payload["trace_id"] = get_trace_id()
        async with httpx.AsyncClient() as client:
            response = await client.post(ML_SERVICE_URL, json=ml_payload, timeout=5.0)
            if response.status_code == 200:
                cb.record_success()
                return response.json()
            else:
                cb.record_failure()
                return deterministic_fallback(ml_payload)
    except httpx.TimeoutException:
        logger.warning("ML Warning: Request to ML Service timed out. Fallback triggered.")
        cb.record_failure()
        return deterministic_fallback(ml_payload)
    except httpx.ConnectError:
        logger.warning("ML Warning: ML Service is unreachable. Fallback triggered.")
        cb.record_failure()
        return deterministic_fallback(ml_payload)
    except Exception as e:
        logger.warning(f"ML Warning: {e}")
        cb.record_failure()
        return deterministic_fallback(ml_payload)
