import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import Request
from src.infrastructure.audit.audit_logger import log_audit

@pytest.fixture
def mock_db():
    with patch("src.database.db") as mock_db_global:
        mock_db_global.auditlog.create = AsyncMock()
        yield mock_db_global

@pytest.mark.asyncio
async def test_log_audit_success_with_forwarded_ip(mock_db):
    mock_request = MagicMock(spec=Request)
    mock_request.headers.get.return_value = "192.168.1.1, 10.0.0.1"
    
    await log_audit("user1", "tenant1", "TEST_ACTION", "patient", "p1", mock_request)
    
    mock_db.auditlog.create.assert_called_once()
    args, kwargs = mock_db.auditlog.create.call_args
    assert kwargs["data"]["ipAddress"] == "192.168.1.1"

@pytest.mark.asyncio
async def test_log_audit_success_with_client_host(mock_db):
    mock_request = MagicMock(spec=Request)
    mock_request.headers.get.return_value = None
    mock_request.client.host = "10.0.0.5"
    
    await log_audit("user1", "tenant1", "TEST_ACTION", "patient", "p1", mock_request)
    
    mock_db.auditlog.create.assert_called_once()
    args, kwargs = mock_db.auditlog.create.call_args
    assert kwargs["data"]["ipAddress"] == "10.0.0.5"

@pytest.mark.asyncio
async def test_log_audit_no_request(mock_db):
    await log_audit("user1", "tenant1", "TEST_ACTION", "patient", "p1")
    
    mock_db.auditlog.create.assert_called_once()
    args, kwargs = mock_db.auditlog.create.call_args
    assert kwargs["data"]["ipAddress"] is None

@pytest.mark.asyncio
async def test_log_audit_failure_graceful_degradation(mock_db):
    mock_db.auditlog.create = AsyncMock(side_effect=Exception("Database Down"))
    
    # Should not raise exception
    await log_audit("user1", "tenant1", "TEST_ACTION", "patient", "p1")
    mock_db.auditlog.create.assert_called_once()
