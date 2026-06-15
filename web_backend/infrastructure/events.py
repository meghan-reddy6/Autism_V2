import json
import uuid
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, Type, TypeVar, Callable, Awaitable
from pydantic import BaseModel, Field

logger = logging.getLogger("event_bus")

class RetryPolicy(BaseModel):
    max_retries: int = 3
    backoff_ms: int = 500

class DomainEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    idempotency_key: Optional[str] = None
    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy)
    event_type: str
    tenant_id: str
    payload: Dict[str, Any]

TEvent = TypeVar("TEvent", bound=DomainEvent)
EventHandler = Callable[[TEvent], Awaitable[None]]

class RedisEventBus:
    def __init__(self):
        self.redis = None
        self._handlers: Dict[str, list[EventHandler]] = {}
        self._pubsub = None
        self._task = None

    def initialize(self, redis_client):
        self.redis = redis_client
        self._running = False
        self._consumer_group = "cg_cache_invalidator"
        self._consumer_name = f"worker_{uuid.uuid4().hex[:8]}"

    async def publish(self, event: DomainEvent):
        if not self.redis:
            logger.warning("EventBus not initialized with Redis. Dropping event.")
            return
            
        event_data = event.model_dump_json()
        await self.redis.xadd(
            "domain_events", 
            {"payload": event_data},
            maxlen=10000, 
            approximate=True
        )
        logger.info(f"Published event {event.event_type} [{event.event_id}] to stream.")

    def subscribe(self, event_type: str, handler: EventHandler):
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def start_listening(self):
        if not self.redis:
            return
            
        self._running = True
        
        try:
            await self.redis.xgroup_create("domain_events", self._consumer_group, id="0", mkstream=True)
        except Exception as e:
            if "BUSYGROUP Consumer Group name already exists" not in str(e):
                logger.error(f"Failed to create consumer group: {e}")
                
        logger.info(f"EventBus listening via Redis Streams. Group: {self._consumer_group}, Worker: {self._consumer_name}")
        
        while self._running:
            try:
                # Read from stream
                streams = await self.redis.xreadgroup(
                    self._consumer_group,
                    self._consumer_name,
                    {"domain_events": ">"},
                    count=10,
                    block=2000
                )
                
                for stream_name, messages in streams:
                    for message_id, message_data in messages:
                        try:
                            payload_str = message_data.get(b"payload", b"").decode("utf-8")
                            if not payload_str:
                                payload_str = message_data.get("payload", "")
                                
                            data = json.loads(payload_str)
                            event = DomainEvent(**data)
                            handlers = self._handlers.get(event.event_type, [])
                            
                            for handler in handlers:
                                try:
                                    await handler(event)
                                except Exception as e:
                                    logger.error(f"Handler failed for event {event.event_type}: {e}")
                                    
                            # Acknowledge successful processing
                            await self.redis.xack("domain_events", self._consumer_group, message_id)
                        except Exception as e:
                            logger.error(f"Failed to process stream message {message_id}: {e}")
                            from logic.cache_telemetry import log_event_drop
                            await log_event_drop(self.redis, "domain_events", str(message_id), str(e))
                            # Acknowledge unprocessable payloads so they don't block PEL forever
                            await self.redis.xack("domain_events", self._consumer_group, message_id)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Stream read error: {e}")
                await asyncio.sleep(1)

    async def stop_listening(self):
        self._running = False

event_bus = RedisEventBus()
