import pytest
from unittest.mock import AsyncMock, patch
from src.controllers.patients.queries import get_assessment_or_404
from fastapi import HTTPException
from src.infrastructure.telemetry.request_context import current_user_role, current_tenant_id, current_user_id

@pytest.fixture(autouse=True)
def setup_contexts():
    current_user_role.set("ORG_ADMIN")
    current_tenant_id.set("tenant-123")
    current_user_id.set("user-123")
    yield
    current_user_role.set(None)
    current_tenant_id.set(None)
    current_user_id.set(None)

@pytest.mark.asyncio
async def test_get_assessment_success():
    with patch("src.controllers.patients.queries.assessment_repo") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value={"id": "a1", "tenantId": "tenant-123"})
        
        result = await get_assessment_or_404("tenant-123", "a1")
        assert result["id"] == "a1"
        mock_repo.get_by_id.assert_called_once_with(tenant_id="tenant-123", id="a1", include=None)

@pytest.mark.asyncio
async def test_get_assessment_with_patient():
    with patch("src.controllers.patients.queries.assessment_repo") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value={"id": "a1", "patient": {"id": "p1"}})
        
        result = await get_assessment_or_404("tenant-123", "a1", include_patient=True)
        assert "patient" in result
        mock_repo.get_by_id.assert_called_once_with(tenant_id="tenant-123", id="a1", include={"patient": True})

@pytest.mark.asyncio
async def test_get_assessment_not_found():
    with patch("src.controllers.patients.queries.assessment_repo") as mock_repo:
        mock_repo.get_by_id = AsyncMock(return_value=None)
        
        with pytest.raises(HTTPException) as exc:
            await get_assessment_or_404("tenant-123", "a1")
            
        assert exc.value.status_code == 404
        assert exc.value.detail == "Assessment not found"
