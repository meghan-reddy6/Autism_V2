import logging
from src.infrastructure.events.events import event_bus, DomainEvent
from src.infrastructure.cache.redis_cache_manager import cache_service

logger = logging.getLogger("cache_invalidation")

async def on_patient_mutation(event: DomainEvent):
    tenant_id = event.tenant_id
    logger.info(f"Invalidating tags for patient mutation. Tenant: {tenant_id}")
    
    # Domains affected: dashboard stats, analytics summary, risk metrics
    await cache_service.invalidate_tags(tenant_id, ["dashboard", "analytics", "risk"])

def subscribe_cache_invalidation_rules():
    # Enforce domain invalidation rules automatically
    event_bus.subscribe("PatientCreated", on_patient_mutation)
    event_bus.subscribe("PatientUpdated", on_patient_mutation)
    event_bus.subscribe("AssessmentCompleted", on_patient_mutation)
    
    logger.info("Cache invalidation rules subscribed to EventBus.")
