import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.repositories.tenant_aware_repository import TenantAwareRepository, ReportRepository
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

@pytest.fixture
def mock_prisma_model():
    repo = TenantAwareRepository("patient")
    # Patch the underlying Prisma model
    mock_model = MagicMock()
    mock_model.find_first = AsyncMock()
    mock_model.find_many = AsyncMock(return_value=[])
    mock_model.count = AsyncMock(return_value=0)
    mock_model.create = AsyncMock()
    mock_model.update_many = AsyncMock()
    mock_model.delete_many = AsyncMock()
    repo.model = mock_model
    return repo, mock_model

@pytest.fixture
def mock_audit_log():
    with patch("src.database.db") as mock_db:
        mock_db.auditlog.create = AsyncMock()
        yield mock_db

@pytest.mark.asyncio
async def test_tenant_isolation_injection():
    repo = TenantAwareRepository("patient")
    where = repo._inject_tenant("tenant-123", {"name": "John"})
    assert where["tenantId"] == "tenant-123"

@pytest.mark.asyncio
async def test_find_first(mock_prisma_model):
    repo, model = mock_prisma_model
    await repo.find_first("tenant-123", {"name": "John"})
    model.find_first.assert_called_once()
    args, kwargs = model.find_first.call_args
    assert kwargs["where"]["tenantId"] == "tenant-123"
    assert kwargs["where"]["isDeleted"] is False

@pytest.mark.asyncio
async def test_find_many(mock_prisma_model):
    repo, model = mock_prisma_model
    await repo.find_many("tenant-123", {"name": "John"})
    model.find_many.assert_called_once()
    args, kwargs = model.find_many.call_args
    assert kwargs["where"]["tenantId"] == "tenant-123"

@pytest.mark.asyncio
async def test_find_unique(mock_prisma_model):
    repo, model = mock_prisma_model
    model.find_first = AsyncMock()
    await repo.find_unique("tenant-123", {"name": "John"})
    # BaseRepository.find_unique uses self.model.find_first internally!
    model.find_first.assert_called_once()
    args, kwargs = model.find_first.call_args
    assert kwargs["where"]["tenantId"] == "tenant-123"

@pytest.mark.asyncio
async def test_get_by_id(mock_prisma_model):
    repo, model = mock_prisma_model
    model.find_first = AsyncMock()
    await repo.get_by_id("tenant-123", "p1")
    model.find_first.assert_called_once()
    args, kwargs = model.find_first.call_args
    assert kwargs["where"]["id"] == "p1"
    assert kwargs["where"]["tenantId"] == "tenant-123"

@pytest.mark.asyncio
async def test_count(mock_prisma_model):
    repo, model = mock_prisma_model
    await repo.count("tenant-123", {"name": "John"})
    model.count.assert_called_once()
    args, kwargs = model.count.call_args
    assert kwargs["where"]["tenantId"] == "tenant-123"

@pytest.mark.asyncio
async def test_create(mock_prisma_model, mock_audit_log):
    repo, model = mock_prisma_model
    
    class MockResult:
        id = "p1"
        def model_dump(self, mode):
            return {"id": "p1", "name": "John"}
            
    model.create.return_value = MockResult()
    
    await repo.create("tenant-123", {"name": "John"})
    model.create.assert_called_once()
    args, kwargs = model.create.call_args
    assert kwargs["data"]["tenantId"] == "tenant-123"
    
    # Verify audit log was created
    mock_audit_log.auditlog.create.assert_called_once()
    audit_args, audit_kwargs = mock_audit_log.auditlog.create.call_args
    assert audit_kwargs["data"]["action"] == "CREATE"

@pytest.mark.asyncio
async def test_update(mock_prisma_model, mock_audit_log):
    repo, model = mock_prisma_model
    
    class MockResult:
        id = "p1"
        def model_dump(self, mode):
            return {"id": "p1", "name": "Jane"}
            
    model.find_many.return_value = [MockResult()]
    
    await repo.update("tenant-123", {"id": "p1"}, {"name": "Jane"})
    model.update_many.assert_called_once()
    args, kwargs = model.update_many.call_args
    assert kwargs["where"]["tenantId"] == "tenant-123"

@pytest.mark.asyncio
async def test_soft_delete(mock_prisma_model, mock_audit_log):
    repo, model = mock_prisma_model
    
    class MockResult:
        id = "p1"
        def model_dump(self, mode):
            return {"id": "p1"}
            
    model.find_many.return_value = [MockResult()]
    
    await repo.soft_delete("tenant-123", {"id": "p1"})
    model.update_many.assert_called_once()
    args, kwargs = model.update_many.call_args
    assert kwargs["where"]["tenantId"] == "tenant-123"
    assert kwargs["data"]["isDeleted"] is True

@pytest.mark.asyncio
async def test_restore(mock_prisma_model):
    repo, model = mock_prisma_model
    await repo.restore("tenant-123", {"id": "p1"})
    model.update_many.assert_called_once()
    args, kwargs = model.update_many.call_args
    assert kwargs["where"]["tenantId"] == "tenant-123"
    assert kwargs["data"]["isDeleted"] is False

@pytest.mark.asyncio
async def test_hard_delete(mock_prisma_model, mock_audit_log):
    repo, model = mock_prisma_model
    
    class MockResult:
        id = "p1"
        def model_dump(self, mode):
            return {"id": "p1"}
            
    model.find_many.return_value = [MockResult()]
    
    await repo.hard_delete("tenant-123", {"id": "p1"})
    model.delete_many.assert_called_once()
    args, kwargs = model.delete_many.call_args
    assert kwargs["where"]["tenantId"] == "tenant-123"

@pytest.mark.asyncio
async def test_tenant_isolation_super_admin():
    current_user_role.set("SUPER_ADMIN")
    repo = TenantAwareRepository("patient")
    where = repo._inject_tenant("tenant-123", {"name": "John"})
    assert "tenantId" not in where

@pytest.mark.asyncio
async def test_missing_tenant_context_raises_error():
    current_user_role.set("ORG_ADMIN")
    current_tenant_id.set(None)
    repo = TenantAwareRepository("patient")
    with pytest.raises(ValueError, match="Tenant context missing"):
        repo._inject_tenant(None, {"name": "John"})

@pytest.mark.asyncio
async def test_nested_relationship_filtering_report():
    repo = ReportRepository("report")
    where = repo._inject_tenant("tenant-123", {})
    assert "session" in where
    assert where["session"]["is"]["tenantId"] == "tenant-123"
