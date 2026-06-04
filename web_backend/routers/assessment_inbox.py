from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import httpx
import os
from prisma import Json

from database import db
from dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/v1/assessment-inbox", tags=["assessment-inbox"])

@router.get("")
async def list_assessment_inbox(
    status: Optional[str] = None,
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    where_clause = {
        "tenantId": current_user.tenantId
    }
    if status:
        # e.g., ?status=CREATED,SENT,IN_PROGRESS,SUBMITTED,UNDER_REVIEW,APPROVED,ARCHIVED,EXPIRED
        statuses = status.split(",")
        if len(statuses) == 1:
            where_clause["status"] = statuses[0]
        else:
            where_clause["status"] = {"in": statuses}

    sessions = await db.assessmentsession.find_many(
        where=where_clause,
        include={
            "patient": True,
            "template": True
        },
        order={
            "createdAt": "desc"
        }
    )
    return sessions

@router.get("/stats")
async def get_assessment_inbox_stats(
    current_user: Any = Depends(require_roles(["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "PSYCHOLOGIST", "THERAPIST"]))
):
    sessions = await db.assessmentsession.find_many(
        where={
            "tenantId": current_user.tenantId
        }
    )
    
    stats = {
        "CREATED": 0,
        "SENT": 0,
        "IN_PROGRESS": 0,
        "SUBMITTED": 0,
        "UNDER_REVIEW": 0,
        "APPROVED": 0,
        "ARCHIVED": 0,
        "EXPIRED": 0,
        "total": len(sessions),
        "overdue": 0, # Assuming overdue if expiresAt < now
        "pending_approvals": 0
    }
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    for session in sessions:
        if session.status in stats:
            stats[session.status] += 1
            
        if session.expiresAt and session.expiresAt < now and session.status not in ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ARCHIVED"]:
            stats["overdue"] += 1
            
        if session.status == "UNDER_REVIEW":
            stats["pending_approvals"] += 1
            
    return stats
