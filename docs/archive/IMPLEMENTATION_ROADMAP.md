# Healthcare Platform Refactoring - Implementation Roadmap

## Current State Analysis

### What We Have
- ✅ Multi-tenant Prisma schema with basic User, Patient, Assessment models
- ✅ FastAPI backend with auth, patients, assessments, dashboard routers
- ✅ Next.js frontend with parent-portal route group
- ✅ Basic audit logging structure
- ✅ ML service integration (rf_model.joblib)

### What We Need to Build
- ❌ Assessment Session model (replaces AssessmentLink)
- ❌ Assessment Template system (configurable forms)
- ❌ Public assessment portal (`/assessment/[token]`)
- ❌ Clinical portal enhancements (inbox, workflows)
- ❌ Role-based access control (RBAC) layer
- ❌ Report generation & approval workflow
- ❌ Report printing/PDF export system
- ❌ Super Admin portal (isolated)
- ❌ Comprehensive audit logging
- ❌ Multi-tenant security layer
- ❌ Authorization middleware at all layers

---

## Implementation Phases

### ✅ Phase 1: Database Schema Extension (FOUNDATION)
**Duration:** 2-4 hours | **Complexity:** Medium | **Dependencies:** None

#### Changes Required

**File: `web_backend/prisma/schema.prisma`**
- Add `AssessmentSession` model (replaces AssessmentLink)
  - Fields: id, token, tenantId, patientId, assessmentTemplateId, status, createdAt, updatedAt, expiresAt, submittedAt, createdBy, reviewedBy, approvedBy
  - Enum: Status (CREATED, SENT, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, APPROVED, ARCHIVED, EXPIRED, CANCELLED)
  
- Add `AssessmentTemplate` model
  - Fields: id, tenantId, name, description, type (M-CHAT-R, CARS, INTAKE, etc.), schema (Json), isActive, createdAt, updatedAt
  - Allows dynamic form configuration
  
- Add `AssessmentResponse` model
  - Fields: id, assessmentSessionId, fieldName, value, metadata
  - Stores submitted form responses
  
- Add `Report` model
  - Fields: id, assessmentSessionId, status (DRAFT, AI_GENERATED, PENDING_REVIEW, APPROVED, ARCHIVED), sections (Json), createdAt, updatedAt, approvedBy, approvedAt
  
- Add `ReportSection` model
  - Fields: id, reportId, name, content, order
  
- Extend `Role` enum
  - Rename: PARENT_USER → PATIENT_PARENT (if keeping, otherwise remove)
  - Keep: SUPER_ADMIN, CLINIC_ADMIN, DOCTOR, PSYCHOLOGIST, THERAPIST, RECEPTIONIST

- Update `User` model
  - Add: suspendedAt (DateTime, optional)
  - Add: lastLoginAt (DateTime, optional)

#### Prisma Actions
```bash
npx prisma migrate dev --name add_assessment_sessions_templates_reports
```

---

### ✅ Phase 2: Parent Portal Removal (CLEANUP)
**Duration:** 1-2 hours | **Complexity:** Low | **Dependencies:** Phase 1

#### Frontend Changes
**File: `frontend/app/(parent-portal)/layout.tsx`**
- DELETE entire directory

**File: `frontend/app/(parent-portal)/my-child/page.tsx`**
- DELETE entire directory

**File: `frontend/components/LogoutButton.tsx`**
- Review & update if parent-specific logic exists

**File: `frontend/app/page.tsx` (main landing page)**
- Remove parent portal navigation links
- Add assessment link entry point (placeholder)

---

### ✅ Phase 3: Backend - Assessment Session & Template APIs
**Duration:** 3-5 hours | **Complexity:** High | **Dependencies:** Phase 1, 2

#### New Files

**File: `web_backend/routers/assessment_sessions.py`**
- `POST /api/v1/assessment-sessions` - Create session (clinical staff only)
  - Generate UUID token
  - Return token + email for sending to patient
  
- `GET /api/v1/assessment-sessions/{sessionId}` - Get session details (clinical staff)
  
- `GET /api/v1/assessment-sessions?patientId=X&status=Y` - List sessions (clinical staff)
  
- `PATCH /api/v1/assessment-sessions/{sessionId}/status` - Update status (clinical staff)

**File: `web_backend/routers/assessment_templates.py`**
- `GET /api/v1/assessment-templates` - List templates (clinical staff)
  
- `POST /api/v1/assessment-templates` - Create template (CLINIC_ADMIN only)
  
- `GET /api/v1/assessment-templates/{templateId}` - Get template schema
  
- `PATCH /api/v1/assessment-templates/{templateId}` - Edit template (CLINIC_ADMIN)

**File: `web_backend/routers/public_assessments.py`**
- `GET /api/v1/public/assessment/{token}` - Get assessment form (NO AUTH REQUIRED)
  - Validate token
  - Return template schema
  
- `POST /api/v1/public/assessment/{token}/responses` - Submit responses (NO AUTH REQUIRED)
  - Validate token
  - Store AssessmentResponse records
  - Update AssessmentSession status to SUBMITTED
  
- `POST /api/v1/public/assessment/{token}/save-draft` - Save progress (NO AUTH REQUIRED)

#### Updated Files

**File: `web_backend/main.py`**
- Add: `app.include_router(assessment_sessions.router)`
- Add: `app.include_router(assessment_templates.router)`
- Add: `app.include_router(public_assessments.router)`

**File: `web_backend/dependencies.py`**
- Add: `validate_assessment_token()` - Public endpoint token validation
- Add: `get_current_user_or_none()` - Optional auth (for future use)

---

### ✅ Phase 4: Frontend - Public Assessment Portal
**Duration:** 4-6 hours | **Complexity:** High | **Dependencies:** Phase 3

#### New Files

**Directory: `frontend/app/assessment/`**

**File: `frontend/app/assessment/[token]/layout.tsx`**
- Minimal layout (no auth nav)
- No sidebar, simple header
- Security notice

**File: `frontend/app/assessment/[token]/page.tsx`**
- Dynamic form renderer
  - Fetch template schema via token
  - Build form fields based on schema
  - Load saved progress if exists
  - Progress indicator

**File: `frontend/app/assessment/[token]/components/FormRenderer.tsx`**
- Generic form component
- Supports: text, textarea, select, checkbox, date, file fields
- Client-side validation
- Auto-save draft (every 30 seconds)

**File: `frontend/app/assessment/[token]/components/ProgressIndicator.tsx`**
- Show form completion %
- Estimated time remaining
- Save status indicator

**File: `frontend/app/assessment/[token]/success/page.tsx`**
- Confirmation page after submission
- Show submission timestamp
- Next steps message

#### Updated Files

**File: `frontend/lib/api-client.ts`**
- Add: `fetchAssessmentTemplate(token)`
- Add: `submitAssessmentResponses(token, responses)`
- Add: `saveDraftResponses(token, responses)`

---

### ✅ Phase 5: Clinical Portal - Patient Management Enhancements
**Duration:** 3-4 hours | **Complexity:** Medium | **Dependencies:** Phase 3

#### Backend Changes

**File: `web_backend/routers/patients.py`** (ENHANCE)
- Enhance `GET /api/v1/patients/{patientId}` to include:
  - Assessment history
  - Report summaries
  - Clinical notes count
  
- Add: `GET /api/v1/patients/{patientId}/assessments` - Assessment history

**File: `web_backend/routers/assessments.py`** (RENAME to assessment_inbox.py)
- Rename → `assessment_inbox.py`
- Replace: `GET /api/v1/assessments` with status filters
  - `?status=CREATED,SENT,IN_PROGRESS,SUBMITTED,UNDER_REVIEW,APPROVED,ARCHIVED,EXPIRED`
  
- Add: `GET /api/v1/assessment-inbox/stats` - Dashboard stats
  - Count by status
  - Overdue sessions
  - Pending approvals

---

### ✅ Phase 6: Clinical Portal - Report Generation
**Duration:** 5-7 hours | **Complexity:** Very High | **Dependencies:** Phase 3, 5

#### New Files

**File: `web_backend/routers/reports.py`**
- `GET /api/v1/reports` - List reports
  
- `POST /api/v1/reports/generate/{assessmentSessionId}` - Trigger report generation
  - Call ML service for analysis
  - Create Report with status DRAFT
  - Store AI findings (risk, recommendations)
  
- `GET /api/v1/reports/{reportId}` - Get report data
  
- `PATCH /api/v1/reports/{reportId}/sections` - Add clinical notes
  
- `PATCH /api/v1/reports/{reportId}/approve` - Approve report (DOCTOR/PSYCHOLOGIST only)
  
- `GET /api/v1/reports/{reportId}/export/pdf` - Generate PDF

**File: `ml_service/report_generator.py`** (NEW)
- Endpoint: `POST /generate-report`
- Input: assessment_scores, patient_demographics
- Output: risk_assessment, recommendations, visualizations
- Integrate SHAP values for explainability

#### Frontend Changes

**Directory: `frontend/app/(clinic)/assessments/[id]/review/`**

**File: `frontend/app/(clinic)/assessments/[id]/review/page.tsx`**
- Display assessment responses
- Show AI analysis
- Form to add clinical notes
- Button to generate/approve report

---

### ✅ Phase 7: Clinical Portal - Assessment Inbox & Workflows
**Duration:** 3-4 hours | **Complexity:** High | **Dependencies:** Phase 5, 6

#### Frontend Changes

**File: `frontend/app/(clinic)/assessments/page.tsx`** (ENHANCE)
- Implement tabbed view:
  - Created
  - Sent
  - In Progress
  - Submitted (most important)
  - Under Review
  - Approved
  - Archived
  - Expired (with regenerate button)

**File: `frontend/app/(clinic)/assessments/components/AssessmentInbox.tsx`**
- Table view with filters
- Columns: Patient, Type, Status, Date, Actions
- Bulk actions (send reminder, regenerate expired)
- Quick preview modal

---

### ✅ Phase 8: Report Printing & PDF Export System
**Duration:** 4-6 hours | **Complexity:** Very High | **Dependencies:** Phase 6

#### Backend Changes

**File: `web_backend/routers/reports.py`** (ENHANCE)
- Modify: `GET /api/v1/reports/{reportId}/export/pdf`
  - Use: python-pptx or reportlab
  - Generate multi-page PDF with:
    - Patient summary
    - Assessment results
    - Charts/visualizations
    - AI analysis
    - Clinical notes
    - Approval signature section
    - Page numbers & timestamps

**File: `web_backend/report_templates.py`** (NEW)
- Report section builders:
  - `build_patient_summary(patient)`
  - `build_assessment_summary(session)`
  - `build_clinical_findings(report)`
  - `build_ai_analysis(report)`
  - `build_charts(assessment_data)`
  - `build_approval_section(report)`

#### Frontend Changes

**File: `frontend/app/(clinic)/reports/[id]/page.tsx`**
- Print button (trigger browser print dialog)
- Export PDF button (server-side generation)
- Print-specific CSS for scaling/pagination

**File: `frontend/app/(clinic)/reports/[id]/print.tsx`**
- Print-optimized layout
- Full content without navigation

**File: `frontend/app/(clinic)/reports/[id]/print.css`** (NEW)
```css
@media print {
  @page {
    size: A4;
    margin: 10mm;
  }
  /* Hide non-printable elements */
  /* Ensure charts scale properly */
  /* Page breaks for sections */
}
```

---

### ✅ Phase 9: Role-Based Access Control (RBAC) - Backend Middleware
**Duration:** 3-4 hours | **Complexity:** Medium | **Dependencies:** Phase 1

#### New Files

**File: `web_backend/auth/permissions.py`**
```python
ROLE_PERMISSIONS = {
    "RECEPTIONIST": ["create_patient", "view_patient", "create_assessment_session"],
    "NURSE": ["view_patient", "record_observations", "view_assessment"],
    "DOCTOR": ["view_patient", "create_clinical_note", "approve_report"],
    "PSYCHOLOGIST": ["view_patient", "view_assessment", "approve_report"],
    "CLINIC_ADMIN": ["manage_users", "create_template", "view_analytics"],
    "SUPER_ADMIN": ["all"]
}
```

**File: `web_backend/auth/authorization.py`**
- Function: `require_permission(permission: str)`
- Function: `require_role(role: str | List[str])`
- Function: `check_tenant_access(user_id, tenant_id)`

#### Updated Files

**File: `web_backend/dependencies.py`**
- Add: `verify_tenant_access()` - Middleware to check tenant_id in request
- Update: `get_current_user()` - Include tenant_id verification

**All router files**
- Add: `current_user: dict = Depends(verify_token_and_tenant)`
- Add: authorization checks before sensitive operations

---

### ✅ Phase 10: Audit Logging System
**Duration:** 2-3 hours | **Complexity:** Medium | **Dependencies:** Phase 1

#### New Files

**File: `web_backend/audit/logger.py`**
```python
async def log_audit(
    user_id: str,
    tenant_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    ip_address: str,
    user_agent: str,
    details: dict = None
)
```

#### Updated Files

**All router files**
- After sensitive operations: `await log_audit(...)`
- Track: LOGIN, VIEW_PATIENT, CREATE_ASSESSMENT, SUBMIT_ASSESSMENT, APPROVE_REPORT, etc.

---

### ✅ Phase 11: Super Admin Portal - Backend
**Duration:** 4-5 hours | **Complexity:** High | **Dependencies:** Phase 1, 9

#### New Files

**File: `web_backend/routers/admin_organizations.py`**
- `GET /api/v1/admin/organizations` - List all orgs
- `POST /api/v1/admin/organizations` - Create org
- `PATCH /api/v1/admin/organizations/{orgId}` - Edit org
- `GET /api/v1/admin/organizations/{orgId}/users` - Users in org

**File: `web_backend/routers/admin_users.py`**
- `GET /api/v1/admin/users` - List all users
- `POST /api/v1/admin/users` - Create user
- `PATCH /api/v1/admin/users/{userId}` - Edit user
- `PATCH /api/v1/admin/users/{userId}/suspend` - Suspend account

**File: `web_backend/routers/admin_templates.py`**
- `GET /api/v1/admin/assessment-templates` - Manage templates globally
- Full CRUD

**File: `web_backend/routers/admin_analytics.py`**
- `GET /api/v1/admin/analytics/usage` - Usage metrics
- `GET /api/v1/admin/analytics/assessments` - Assessment stats
- `GET /api/v1/admin/analytics/organizations` - Org performance

#### Updated Files

**File: `web_backend/main.py`**
- Add admin routers (with SUPER_ADMIN guard)

---

### ✅ Phase 12: Super Admin Portal - Frontend
**Duration:** 4-6 hours | **Complexity:** High | **Dependencies:** Phase 11

#### New Files

**Directory: `frontend/app/admin/`**

**File: `frontend/app/admin/layout.tsx`**
- Isolated layout (separate nav, sidebar)
- Admin-only header branding

**File: `frontend/app/admin/page.tsx`**
- Dashboard with metrics
- Quick actions

**File: `frontend/app/admin/organizations/page.tsx`**
- Organization list
- Create/edit org modal

**File: `frontend/app/admin/users/page.tsx`**
- Global user management
- Suspend/activate users

**File: `frontend/app/admin/templates/page.tsx`**
- Assessment template management

**File: `frontend/app/admin/analytics/page.tsx`**
- System-wide analytics
- Charts & metrics

#### Security

**File: `frontend/app/admin/AdminGuard.tsx`**
- Check: `user.role === SUPER_ADMIN`
- Redirect non-admin users to `/`

---

### ✅ Phase 13: Multi-Tenant Security Enforcement
**Duration:** 2-3 hours | **Complexity:** Medium | **Dependencies:** Phase 9

#### Changes Across Codebase

**Every API endpoint must verify:**
1. User has valid JWT
2. JWT's tenantId matches request's tenantId
3. User's role has permission
4. Resource (patient, assessment, etc.) belongs to user's tenant

**Every database query must filter:**
```python
# GOOD - with tenant isolation
patients = db.patient.find_many(
    where={
        "tenantId": current_user.tenantId,
        "id": patient_id
    }
)

# BAD - missing tenant check
patients = db.patient.find_many(where={"id": patient_id})
```

**File: `web_backend/security/tenant_validator.py`** (NEW)
- Function: `verify_tenant_resource_access(user_id, tenant_id, resource_id, resource_type)`

---

### ✅ Phase 14: Frontend Route Guards (All Portals)
**Duration:** 2-3 hours | **Complexity:** Low | **Dependencies:** Phase 2, 5, 12

#### New Components

**File: `frontend/components/ClinicalGuard.tsx`**
- Check: user logged in + role in [DOCTOR, NURSE, RECEPTIONIST, etc.]
- Redirect to /login

**File: `frontend/components/AdminGuard.tsx`**
- Check: user.role === SUPER_ADMIN
- Redirect to /

**File: `frontend/app/(clinic)/layout.tsx`** (UPDATE)
- Wrap with `<ClinicalGuard>`

**File: `frontend/app/admin/layout.tsx`** (UPDATE)
- Wrap with `<AdminGuard>`

---

### ✅ Phase 15: Assessment Link Generation & Email
**Duration:** 2-3 hours | **Complexity:** Medium | **Dependencies:** Phase 3, 4

#### Backend Changes

**File: `web_backend/email/service.py`** (NEW)
```python
async def send_assessment_link(
    patient_email: str,
    patient_name: str,
    assessment_token: str,
    clinic_name: str
)
```

**File: `web_backend/routers/assessment_sessions.py`** (ENHANCE)
- After session creation: send email with unique link
- Link format: `https://yourdomain.com/assessment/{token}`

#### Frontend Changes

**File: `frontend/app/(clinic)/assessments/components/CreateSessionModal.tsx`** (NEW)
- Form to create assessment session
- Select: Patient, Template, Recipient (email)
- Button: "Create & Send"
- Shows token & email sent confirmation

---

### ✅ Phase 16: Testing & Validation
**Duration:** 5-7 hours | **Complexity:** High | **Dependencies:** All phases

#### Test Files

**File: `web_backend/tests/test_assessment_sessions.py`**
- Test token generation & validation
- Test status transitions
- Test expiration logic

**File: `web_backend/tests/test_public_assessments.py`**
- Test public access (no auth required)
- Test form submission
- Test draft saving

**File: `web_backend/tests/test_rbac.py`**
- Test permission checks
- Test role-based access

**File: `web_backend/tests/test_tenant_isolation.py`**
- Test tenant cannot access other's data
- Test cross-tenant query blocks

**File: `frontend/__tests__/assessment.test.tsx`**
- Test form renderer
- Test auto-save
- Test submission

#### Integration Tests
- Create assessment → Send email → Complete form → Submit → Generate report → Approve

---

## Implementation Timeline

| Phase | Duration | Priority | Dependencies |
|-------|----------|----------|--------------|
| 1: DB Schema | 2-4h | 🔴 P0 | None |
| 2: Remove Parent Portal | 1-2h | 🔴 P0 | Phase 1 |
| 3: Assessment Session APIs | 3-5h | 🔴 P0 | Phase 1,2 |
| 4: Public Portal | 4-6h | 🔴 P0 | Phase 3 |
| 5: Patient Mgmt | 3-4h | 🟠 P1 | Phase 3 |
| 6: Report Generation | 5-7h | 🟠 P1 | Phase 3,5 |
| 7: Assessment Inbox | 3-4h | 🟠 P1 | Phase 5,6 |
| 8: PDF/Print | 4-6h | 🟡 P2 | Phase 6 |
| 9: RBAC Middleware | 3-4h | 🔴 P0 | Phase 1 |
| 10: Audit Logging | 2-3h | 🟠 P1 | Phase 1 |
| 11: Admin Backend | 4-5h | 🟠 P1 | Phase 1,9 |
| 12: Admin Frontend | 4-6h | 🟠 P1 | Phase 11 |
| 13: Tenant Security | 2-3h | 🔴 P0 | Phase 9 |
| 14: Route Guards | 2-3h | 🟡 P2 | Phase 2,5,12 |
| 15: Email & Links | 2-3h | 🟠 P1 | Phase 3,4 |
| 16: Testing | 5-7h | 🟠 P1 | All |
| | **~61-86 hours** | | |

---

## Critical Success Factors

### Must-Have Immediately
1. ✅ Database schema updated (foundation for everything)
2. ✅ Parent portal fully removed (clean break from old model)
3. ✅ Public assessment portal working (core feature)
4. ✅ RBAC enforced at API layer (security requirement)
5. ✅ Tenant isolation verified (data security)

### Security Gates (No Skipping)
- [ ] Tenant isolation audit (cross-verify no data leakage)
- [ ] Permission checks on every protected endpoint
- [ ] Assessment token validation (no traversal attacks)
- [ ] Public assessment form cannot see patient data
- [ ] Super admin portal only for SUPER_ADMIN role

### Testing Gates
- [ ] Assessment from public link works end-to-end
- [ ] Clinical staff can see all assessments for their tenant only
- [ ] Report generation calls ML service correctly
- [ ] Audit logs record all sensitive actions
- [ ] Email links expire properly

---

## Recommended Execution Order

```
Week 1:
  → Phase 1: Database schema
  → Phase 2: Parent portal removal
  → Phase 9: RBAC middleware (protect everything first)
  → Phase 13: Tenant security layer

Week 2:
  → Phase 3: Assessment Session APIs
  → Phase 4: Public assessment portal
  → Phase 15: Email & link generation

Week 3:
  → Phase 5: Patient management enhancements
  → Phase 6: Report generation
  → Phase 7: Assessment inbox

Week 4:
  → Phase 8: PDF/print system
  → Phase 10: Audit logging
  → Phase 11-12: Super Admin portal
  → Phase 14: Route guards
  → Phase 16: Testing

Week 5:
  → Bug fixes, security hardening, documentation
  → Integration testing
  → Performance optimization
  → Deployment preparation
```

---

## Key Architectural Decisions

1. **Assessment Tokens:** UUID-based, single-use (can be regenerated)
2. **Auth Split:** JWT for logged-in users, token validation for public forms
3. **Report States:** DRAFT → AI_GENERATED → PENDING_REVIEW → APPROVED (irreversible after approval)
4. **Tenant Isolation:** Filter every query by tenantId + validate ownership
5. **Audit Trail:** Immutable logs, never deleted, includes IP + user agent
6. **Schema Flexibility:** Template uses Json field for dynamic forms
7. **Email Service:** Deferred (Phase 15) but planned

---

## Questions for User

1. **Email Service:** Should we use SendGrid, AWS SES, or internal SMTP?
2. **PDF Library:** Prefer reportlab, python-pptx, or Weasyprint?
3. **ML Integration:** Is rf_model.joblib already trained? Should we trigger async?
4. **Deployment:** Single server or containerized (Docker Compose)?
5. **Timeline Pressure:** Any hard deadlines?

---

## Success Metrics

- ✅ Parent portal completely removed
- ✅ Public assessment link works (from clinician → patient → report)
- ✅ Tenant A cannot access Tenant B data (verified via tests)
- ✅ All sensitive actions logged
- ✅ Reports generate with AI analysis + clinical approval
- ✅ Super admin can manage platform-wide settings
- ✅ Zero cross-tenant vulnerabilities
- ✅ All endpoints protected by RBAC

