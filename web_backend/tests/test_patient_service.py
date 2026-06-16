import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.services.patient_service import PatientService
from src.schemas.patient import PatientCreate
from src.infrastructure.telemetry.request_context import current_user_role, current_tenant_id, current_user_id
from prisma.errors import UniqueViolationError
import datetime

@pytest.fixture
def mock_db_service():
    with patch("src.services.patient_service.db") as mock_db, \
         patch("src.services.patient_service.event_bus") as mock_bus:
         
        mock_db.patient.count = AsyncMock(return_value=0)
        
        # Mock tx
        mock_tx = AsyncMock()
        mock_db.tx.return_value.__aenter__.return_value = mock_tx
        
        yield mock_db, mock_bus, mock_tx

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
async def test_patient_creation_success(mock_db_service):
    mock_db, mock_bus, mock_tx = mock_db_service
    
    service = PatientService()
    
    # Mock repository
    service.patient_repo.create = AsyncMock()
    mock_result = MagicMock()
    mock_result.id = "p1"
    mock_result.mrn = "12345"
    service.patient_repo.create.return_value = mock_result
    
    data = PatientCreate(firstName="John", lastName="Doe", dateOfBirth=datetime.date(2020, 1, 1), gender="M")
    result = await service.create_patient(data)
    
    assert result.id == "p1"
    service.patient_repo.create.assert_called_once()
    mock_bus.publish.assert_called_once()
    
    # Assert MRN logic called
    mock_db.patient.count.assert_called_once()

@pytest.mark.asyncio
async def test_patient_creation_missing_tenant():
    current_tenant_id.set(None)
    service = PatientService()
    data = PatientCreate(firstName="John", lastName="Doe", dateOfBirth=datetime.date(2020, 1, 1), gender="M")
    
    with pytest.raises(ValueError, match="Tenant context missing"):
        await service.create_patient(data)

@pytest.mark.asyncio
async def test_patient_creation_mrn_collision_retry(mock_db_service):
    mock_db, mock_bus, mock_tx = mock_db_service
    
    service = PatientService()
    
    # Fail first time, succeed second
    service.patient_repo.create = AsyncMock(side_effect=[UniqueViolationError("Collision"), MagicMock(id="p2", mrn="123")])
    
    data = PatientCreate(firstName="John", lastName="Doe", dateOfBirth=datetime.date(2020, 1, 1), gender="M")
    result = await service.create_patient(data)
    
    assert result.id == "p2"
    assert service.patient_repo.create.call_count == 2
    assert mock_db.patient.count.call_count == 2

@pytest.mark.asyncio
async def test_patient_creation_mrn_exhaustion(mock_db_service):
    mock_db, mock_bus, mock_tx = mock_db_service
    service = PatientService()
    
    service.patient_repo.create = AsyncMock(side_effect=UniqueViolationError("Collision"))
    
    data = PatientCreate(firstName="John", lastName="Doe", dateOfBirth=datetime.date(2020, 1, 1), gender="M")
    with pytest.raises(RuntimeError, match="Failed to generate a unique MRN"):
        await service.create_patient(data)

@pytest.mark.asyncio
async def test_get_patient_with_summary():
    service = PatientService()
    service.patient_repo.find_first = AsyncMock(return_value=MagicMock(model_dump=lambda: {"id": "p1", "clinicalNotes": [{"id": 1}]}))
    
    result = await service.get_patient_with_summary("p1")
    assert result["id"] == "p1"
    assert result["clinicalNotesCount"] == 1

@pytest.mark.asyncio
async def test_get_patient_assessments():
    service = PatientService()
    service.patient_repo.find_first = AsyncMock(return_value=MagicMock())
    service.assessment_repo.find_many = AsyncMock(return_value=[{"id": "a1"}])
    
    result = await service.get_patient_assessments("p1")
    assert len(result) == 1
    assert result[0]["id"] == "a1"
