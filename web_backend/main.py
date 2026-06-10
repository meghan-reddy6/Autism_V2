from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from core.context import current_ip_address
import logging
from contextlib import asynccontextmanager
import os
import asyncio
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.backends.inmemory import InMemoryBackend
from redis import asyncio as aioredis

from core.events import event_bus
from services.cache_invalidation import subscribe_cache_invalidation_rules
from core.middleware import SecurityHeadersMiddleware

from database import db
from routers import auth, assessment_inbox, assessment_templates, admin, super_admin, recycle_bin, mfa, reports, assessment_sessions
from routers.api.v1 import dashboard, public_assessments, patients

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dependencies import limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Connecting to database...")
    await db.connect()
    
    # Initialize Cache (Redis)
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    offline_mode = os.getenv("OFFLINE_MODE", "False").lower() in ("true", "1", "yes")
    
    try:
        redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=False)
        # Test connection
        await redis.ping()
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
        logger.info("Connected to Redis cache.")
        
        # Initialize EventBus
        event_bus.initialize(redis)
        subscribe_cache_invalidation_rules()
        event_bus._task = asyncio.create_task(event_bus.start_listening())
        
    except Exception as e:
        if offline_mode:
            logger.warning(f"Offline mode enabled. Falling back to InMemoryBackend: {e}")
            FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
        else:
            logger.error(f"Failed to connect to Redis. Redis is mandatory unless OFFLINE_MODE=True: {e}")
            raise RuntimeError(f"Mandatory Redis connection failed: {e}")
        
    yield
    
    logger.info("Disconnecting from database...")
    await event_bus.stop_listening()
    if event_bus._task:
        event_bus._task.cancel()
    await db.disconnect()

app = FastAPI(
    title="Enterprise Clinical SaaS API",
    description="Electronic Medical Record (EMR) and Clinical Decision Support System (CDSS) Backend",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)

class IPCaptureMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0]
        else:
            ip = request.client.host if request.client else None
        current_ip_address.set(ip)
        return await call_next(request)

app.add_middleware(IPCaptureMiddleware)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(assessment_inbox.router)
app.include_router(dashboard.router)
app.include_router(assessment_sessions.router)
app.include_router(assessment_templates.router)
app.include_router(public_assessments.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(super_admin.router)
app.include_router(recycle_bin.router)
app.include_router(mfa.router)

# Removed deprecated startup/shutdown events

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}