from .base_repo import BaseRepository

# We can easily instantiate other repos here since they don't need custom logic yet
user_repo = BaseRepository("user")
assessment_repo = BaseRepository("assessment")
tenant_repo = BaseRepository("tenant")
