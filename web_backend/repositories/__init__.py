from .base_repo import BaseRepository
from .patient_repo import patient_repo

# We can easily instantiate other repos here since they don't need custom logic yet
user_repo = BaseRepository("user")
assessment_repo = BaseRepository("assessment")
session_repo = BaseRepository("assessmentsession")
tenant_repo = BaseRepository("tenant")
report_repo = BaseRepository("report")
