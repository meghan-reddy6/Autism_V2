# Frontend Architecture

This directory houses the Next.js and TypeScript frontend for the clinical dashboard, rendering diagnostic visualizations and orchestrating clinical data workflows.

## 1. State & Data Routing

All clinical assessments dynamically route incoming form responses through a singular factory engine to ensure mathematical safety before rendering.
- **Form to Factory**: Data sourced from clinical forms (`frontend/src/features/assessments/data/assessment-forms.ts`) is pushed as a raw payload into our visualizers.
- **`AssessmentChartAdapter.ts`**: The factory gateway (`src/features/assessments/logic/AssessmentChartAdapter.ts`) cleanly intercepts the raw numeric data arrays, calculates domain-specific totals using isolated configuration enums, and outputs a strict array format ready for injection into Recharts (`DiagnosticRadar.tsx` and `DomainComparisonChart.tsx`).

## 2. Severity Engines & Visual Baselines

Visual thresholds, clinical risk metrics, and mapping arrays for the distinct diagnostic scales are securely isolated:
- **CARS**: Native support for decimal boundaries mapping to Non-Autistic (<30), Mild-to-Moderate (30-36.5), and Severe (37+) thresholds.
- **M-CHAT-R**: Logic dictating binary reverse-scoring and fail thresholds.
- **GARS-2**: Explicit boundaries mapping to 3 sub-domains (Stereotyped Behaviors, Communication, Social Interaction) with 41 structured questions.
- **ISAA**: Safely parses a 5-point ordinal matrix mapping to 6 extensive psychometric domains with a maximum possible total score of 200.

## 3. Container Runtime

To facilitate seamless local developer iteration without container rebuilding, the frontend leverages a Docker volume bind-mount.
- **`WATCHPACK_POLLING=true`**: This environment variable ensures Next.js actively polls the native file system for immediate hot-reloading. The local source code synchronizes effortlessly with the internal `/app` directory inside the Docker network.
