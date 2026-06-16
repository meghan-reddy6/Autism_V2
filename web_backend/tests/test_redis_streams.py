import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from src.infrastructure.events.events import RedisEventBus, DomainEvent

@pytest.mark.asyncio
async def test_redis_streams_publish_and_consume():
    # Mock redis client
    mock_redis = AsyncMock()
    mock_redis.xadd = AsyncMock()
    
    bus = RedisEventBus()
    bus.initialize(mock_redis)
    
    # 1. Test Publish
    event = DomainEvent(event_type="test_event", tenant_id="t1", payload={"data": 1})
    await bus.publish(event)
    
    mock_redis.xadd.assert_called_once()
    args, kwargs = mock_redis.xadd.call_args
    assert args[0] == "domain_events"
    assert "payload" in args[1]
    
    # 2. Test Subscribe/Acknowledge
    handler = AsyncMock()
    bus.subscribe("test_event", handler)
    
    # Mock stream response
    # [(stream_name, [(message_id, message_data)])]
    mock_redis.xreadgroup.return_value = [
        (b"domain_events", [
            (b"123-0", {b"payload": event.model_dump_json().encode("utf-8")})
        ])
    ]
    
    # We run listening once by overriding loop slightly or just let it process one batch.
    # Actually, we can manually trigger the read logic to avoid blocking forever.
    bus._running = True
    # mock readgroup to raise CancelledError after first read
    mock_redis.xreadgroup.side_effect = [
        [
            (b"domain_events", [
                (b"123-0", {b"payload": event.model_dump_json().encode("utf-8")})
            ])
        ],
        asyncio.CancelledError()
    ]
    
    await bus.start_listening()
    
    handler.assert_called_once()
    # Check xack
    mock_redis.xack.assert_called_once_with("domain_events", bus._consumer_group, b"123-0")
