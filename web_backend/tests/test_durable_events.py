import pytest
from unittest.mock import AsyncMock
from src.infrastructure.events.events import RedisEventBus, DomainEvent

@pytest.mark.asyncio
async def test_event_bus_publish():
    bus = RedisEventBus()
    mock_redis = AsyncMock()
    bus.initialize(mock_redis)
    
    event = DomainEvent(
        event_type="PatientCreated",
        tenant_id="tenant_123",
        payload={"id": "pat_1"}
    )
    
    await bus.publish(event)
    
    mock_redis.publish.assert_called_once()
    args, _ = mock_redis.publish.call_args
    assert args[0] == "domain_events"
    assert "PatientCreated" in args[1]
    assert "tenant_123" in args[1]
    assert "event_id" in args[1]
