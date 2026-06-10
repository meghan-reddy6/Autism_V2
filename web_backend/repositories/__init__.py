from .base_repo import BaseRepository
from .tenant_repo import TenantAwareRepository
from .report_repo import ReportRepository

user_repo = BaseRepository("user")
tenant_repo = BaseRepository("tenant")
patient_repo = TenantAwareRepository("patient")
assessment_session_repo = TenantAwareRepository("assessmentsession")
assessment_template_repo = TenantAwareRepository("assessmenttemplate", has_soft_delete=False)
assessment_repo = TenantAwareRepository("assessment")
report_repo = ReportRepository("report")
