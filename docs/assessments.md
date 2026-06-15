# Clinical Assessments System

## Overview
The platform supports dynamic, template-driven clinical assessments (e.g., CARS, GARS-2, M-CHAT-R). The architecture ensures that adding a new assessment type requires minimal backend changes, as scales are largely data-driven on the frontend and flexibly stored in the backend.

## Assessment Schema System
1. **Templates**: An assessment is based on a template defined in `lib/assessment-forms.ts`.
2. **Sessions**: When a clinician starts an evaluation for a patient, an `AssessmentSession` is created in the database linking the template, the clinician, and the patient.
3. **Responses**: As the clinician answers questions, the raw key-value pairs (e.g., `{"cars_1": "Normal", "cars_2": "Mildly abnormal"}`) are stored in the database.

## Frontend Form Definitions (`assessment-forms.ts`)
The `frontend/lib/assessment-forms.ts` file acts as the single source of truth for the UI rendering of an assessment. It defines:
- The scale name and type.
- The sections and individual questions.
- The input types (radio buttons, selects, text areas).
- The mapping values (e.g., "Normal", "Mildly abnormal").

## Scoring Process & Calculation
1. Once a session is finalized on the frontend, a `triggerScoring` request is sent to the backend (`/api/v1/reports/generate/{sessionId}`).
2. The backend extracts the raw responses from the database.
3. It maps text-based answers ("Normal", "Never", "Yes/No") into numerical values based on deterministic clinical rubrics.
4. The numerical features and total scores are bundled into a payload and sent to the ML Service for advanced risk prediction and SHAP analysis.

## Report Generation
- The ML Service returns a payload containing:
  - `risk_level`: The predicted risk tier (e.g., Low, Moderate, High).
  - `confidence_score`: The model's confidence in the prediction.
  - `shap_breakdown`: The top contributing questions that drove the prediction.
- This data is saved in a `Report` entity.
- The frontend renders this report via `features/assessments/components/AssessmentVisuals.tsx`, utilizing Recharts to draw Radar charts and SHAP bar charts.
- The clinician reviews the AI-generated report, appends clinical notes, and clicks "Approve" to lock the assessment.

## How to Add a New Assessment
1. **Frontend**: Open `frontend/lib/assessment-forms.ts` and add a new template object defining the questions, options, and metadata.
2. **Frontend UI Rendering**: Update `frontend/features/assessments/logic/assessmentScales.ts` to include the new scale's questions so the results page can display the submitted answers properly.
3. **Frontend Chart Logic**: Update `generateChartData` and `getMaxScore` in `frontend/features/assessments/logic/assessmentScoreCalculator.ts` to support the new scale's domains.
4. **Backend Scoring**: Update `web_backend/domains/patients/reports.py` (and potentially `assessments.py` if custom scoring is duplicated) to handle the string-to-integer conversion logic for the new scale before sending data to the ML service.
5. **ML Service**: Ensure the downstream ML service model supports the new `scale_type` payload.
