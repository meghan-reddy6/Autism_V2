from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from database import db
from routers import auth, patients, assessment_inbox, dashboard, assessment_sessions, assessment_templates, public_assessments, admin, super_admin, recycle_bin, mfa, reports

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dependencies import limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Enterprise Clinical SaaS API",
    description="Electronic Medical Record (EMR) and Clinical Decision Support System (CDSS) Backend",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.on_event("startup")
async def startup():
    logger.info("Connecting to database...")
    await db.connect()
    
    # We could place seed logic here if needed

@app.on_event("shutdown")
async def shutdown():
    logger.info("Disconnecting from database...")
    await db.disconnect()

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}