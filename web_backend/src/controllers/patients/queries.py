from fastapi import HTTPException
from src.repositories.tenant_aware_repository import assessment_repo

async def get_assessment_or_404(tenant_id: str, assessment_id: str, include_patient: bool = False):
    include_args = {"patient": True} if include_patient else None
    
    assessment = await assessment_repo.get_by_id(
        tenant_id=tenant_id,
        id=assessment_id,
        include=include_args
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment
