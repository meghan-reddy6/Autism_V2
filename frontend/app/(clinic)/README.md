# Frontend: Clinical Operations (EHR)

## Overview
- **Component:** `frontend/app/(clinic)`
- **Purpose:** The primary workspace for Doctors, Therapists, and Clinical Administrators.
- **Responsibilities:** Managing patient rosters, capturing structured clinical assessments, reviewing ML insights, and generating formalized reports.

---

## Architecture & Layout
All routes inside `(clinic)` share the `layout.tsx` file.
- **Layout:** Implements a persistent left sidebar navigation and a top header containing the active user's credentials.
- **Authorization:** The entire route group is wrapped in `<AuthGuard>`, meaning unauthenticated users attempting to access `/dashboard` or `/patients` will be seamlessly redirected to `/login`.

---

## Directory Structure & Business Logic

### `/dashboard`
- **Purpose:** The clinician's landing page.
- **Features:** Displays quick-action widgets and high-level metric summaries (e.g., "Assessments completed this week").

### `/patients`
- **Purpose:** Patient Roster and Electronic Health Record (EHR) interface.
- **`[id]/page.tsx`:** The unified patient chart.
  - Fetches and displays patient demographics.
  - Lists all historical assessments associated with that specific patient.
  - Provides deep links to view historical clinical reports.

### `/assessments`
- **Purpose:** The core evaluation and scoring module.
- **`/new/page.tsx`:** The intake form. Clinicians select a patient, select an assessment template (e.g., CARS, GARS-2), and fill out raw item scores. The frontend handles complex nested array state using React Hook Form.
- **`/[id]/page.tsx`:** The Assessment Review page.
  - Once an assessment is completed, this page displays the final computed score.
  - **Explainable AI Integration:** It surfaces a "View ML Insight" button that triggers the `CDSSModal.tsx` component, allowing the clinician to visually understand the `shap_breakdown` from the ML service.
  - **Soft Delete:** Includes a highly restricted "Delete Report" button that issues a `DELETE` request to the backend. Because of the backend's architecture, this removes it from the clinic view immediately but preserves it in the database for compliance.

### `/settings`
- **Purpose:** User preferences and security.
- **Features:** Imports the `SecuritySettings.tsx` component to allow clinicians to change their password and manage Google Authenticator MFA independently from IT.
