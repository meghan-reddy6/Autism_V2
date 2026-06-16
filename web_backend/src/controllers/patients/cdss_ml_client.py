import httpx
import os
from typing import Dict, Any

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001/analyze")

import logging
logger = logging.getLogger(__name__)

from src.infrastructure.telemetry.request_context import get_trace_id

async def fetch_ml_metadata(ml_payload: Dict[str, Any]) -> Dict[str, Any]:
    ml_metadata = {"status": "unavailable"}
    try:
        ml_payload["trace_id"] = get_trace_id()
        async with httpx.AsyncClient() as client:
            response = await client.post(ML_SERVICE_URL, json=ml_payload, timeout=5.0)
            if response.status_code == 200:
                ml_metadata = response.json()
    except httpx.TimeoutException:
        logger.warning("ML Warning: Request to ML Service timed out. Fallback triggered.")
    except httpx.ConnectError:
        logger.warning("ML Warning: ML Service is unreachable. Fallback triggered.")
    except Exception as e:
        logger.warning(f"ML Warning: {e}")
    return ml_metadata
