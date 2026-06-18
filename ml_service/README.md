# ML Service Engine

This decoupled microservice isolates complex clinical model evaluations and SHAP matrix calculations from the operational API.

## 1. Inference Endpoints
The service listens primarily on the `/analyze` route.
- **Request Expectation**: The endpoint expects a pure numeric array stripped of any ePHI, along with standard assessment metadata identifying the scale architecture.
- **Response Schema**: Upon successful inference, the model returns a structured JSON payload containing deterministic outputs:
  - `normalized_score`: The aggregated risk scalar.
  - `risk_level`: The predicted severity classification.
  - `confidence_score`: The mathematical probability confidence matrix.
  - `shap_breakdown`: An explainability matrix highlighting the exact diagnostic feature weights contributing to the prediction.

## 2. Feature Vectors
The core inference engine handles specific ingestion matrices depending on the underlying diagnostic scale:
- **CARS Vectors**: Receives arrays of 15 natively floated decimals representing standard CARS items.
- **ISAA Vectors**: Specifically processes a strict 40-item float vector scaled from 1 to 5 to generate comprehensive SHAP analytics arrays accurately reflecting the 200-point 6-domain Indian Scale for Assessment of Autism.
