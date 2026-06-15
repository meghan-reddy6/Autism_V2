# Machine Learning Service Integration

## Overview
The platform interfaces with an external ML Service (typically running on port `8001`) to provide Clinical Decision Support System (CDSS) capabilities. The ML Service evaluates raw clinical assessment scores and returns deterministic predictions, confidence intervals, and SHAP (SHapley Additive exPlanations) breakdowns.

## Request Flow
1. **Trigger**: A clinician clicks "Generate ML Score & Report" on the frontend.
2. **Backend Construction**: The FastAPI backend parses the database responses, converts them into numerical features, and sums the total score.
3. **HTTP Dispatch**: The backend utilizes the `domains/patients/ml_client.py` utility to dispatch an asynchronous POST request to the ML Service.
4. **Processing**: The ML Service evaluates the payload against its trained clinical models (e.g., Random Forests, XGBoost) and calculates SHAP values.
5. **Ingestion**: The FastAPI backend receives the response and serializes it into a JSON field stored within the `Report` table.

## Endpoints
- **URL**: Defined by the `ML_SERVICE_URL` environment variable. Defaults to `http://ml-service:8001/analyze`.
- **Method**: `POST`
- **Payload Schema**:
  ```json
  {
    "scale_type": "CARS",
    "normalized_score": 42,
    "age_months": 36,
    "features": {
      "cars_1": 2,
      "cars_2": 3
    }
  }
  ```
- **Response Schema**:
  ```json
  {
    "risk_level": "High",
    "confidence_score": 0.89,
    "shap_breakdown": {
      "cars_2": 0.4,
      "cars_1": 0.2
    }
  }
  ```

## Timeout & Retry Behavior
- **Timeouts**: The connection is configured with a strict `5.0` second timeout (`timeout=5.0` in `httpx.AsyncClient`). If the ML Service is cold-starting or overwhelmed, the request will drop to prevent blocking the FastAPI event loop.
- **Retries**: Retries are not currently automated on the backend to prevent cascading failures. Instead, the user is prompted on the frontend to try again.
- **Failure Handling**: 
  - If the ML Service is unreachable (Connection Error) or times out, `ml_client.py` catches the `httpx.TimeoutException` or `httpx.RequestError`.
  - It safely falls back to returning a default payload: `{"status": "unavailable", "risk_level": "Pending Analysis"}`.
  - This allows the deterministic score (the raw addition of values) to still be saved and rendered to the clinician, ensuring that a microservice outage does not completely block clinical workflows.
