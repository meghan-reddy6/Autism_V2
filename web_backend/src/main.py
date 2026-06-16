from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from src.infrastructure.telemetry.request_context import current_ip_address, current_trace_id
import uuid
import logging
from src.infrastructure.config.logging_config import setup_structured_logging
from contextlib import asynccontextmanager
import os
import asyncio
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.backends.inmemory import InMemoryBackend
from redis import asyncio as aioredis

from src.infrastructure.events.events import event_bus
from src.infrastructure.cache.cache_invalidation import subscribe_cache_invalidation_rules
from src.infrastructure.middleware.security_headers_middleware import SecurityHeadersMiddleware

from src.database import db
from src.controllers import auth, dashboard, mfa
from src.controllers.patients import patients, assessment_sessions, public_assessments, reports
from src.controllers.admin import admin, super_admin, recycle_bin, team

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from src.api.dependencies import limiter

setup_structured_logging()
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

class TracePropagationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-Id") or str(uuid.uuid4())
        current_trace_id.set(trace_id)
        
        response = await call_next(request)
        response.headers["X-Trace-Id"] = trace_id
        return response

app.add_middleware(TracePropagationMiddleware)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

import traceback
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    with open("debug_exceptions.log", "a") as f:
        f.write(f"Exception on {request.url.path}:\n")
        traceback.print_exc(file=f)
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=500, content={"message": "Internal Server Error Dumped", "detail": str(exc)})

app.include_router(auth.router)
app.include_router(patients.router)

app.include_router(dashboard.router)
app.include_router(assessment_sessions.router)
app.include_router(public_assessments.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(super_admin.router)
app.include_router(recycle_bin.router)
app.include_router(mfa.router)
app.include_router(team.router)

# Removed deprecated startup/shutdown events

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}