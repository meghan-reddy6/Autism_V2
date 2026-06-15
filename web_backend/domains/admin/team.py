from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import require_roles, get_current_user
from database import db
from infrastructure.context import current_tenant_id, current_user_id
from pydantic import BaseModel
from typing import Optional, Any
import bcrypt

class TeamMemberCreate(BaseModel):
    email: str
    firstName: str
    lastName: str
    role: str
    password: str = "Welcome@123"

from domains.admin.shared_logic import UserUpdateBase, create_hashed_user

class TeamMemberUpdate(UserUpdateBase):
    pass

router = APIRouter(
    prefix="/api/v1/team",
    tags=["Team"]
)

@router.get("")
async def list_team_members(current_user: Any = Depends(require_roles(["ORG_ADMIN", "SUPER_ADMIN", "RECEPTIONIST", "DOCTOR"]))):
    tenant_id = current_tenant_id.get()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant context found")
        
    from infrastructure.tenantAwareRepository import user_repo
    users = await user_repo.find_many(
        tenant_id=tenant_id
    )
    return users

@router.get("/roles")
async def get_roles():
    from auth.permissions import ROLE_PERMISSIONS
    return {"roles": list(ROLE_PERMISSIONS.keys()), "permissions_map": ROLE_PERMISSIONS}

@router.post("")
async def create_team_member(user: TeamMemberCreate, current_user: Any = Depends(require_roles(["ORG_ADMIN", "SUPER_ADMIN"]))):
    tenant_id = current_tenant_id.get()
    if not tenant_id:
        raise HTTPException(status_code=400, detail="No tenant context found")
        
    # Prevent creating SUPER_ADMIN via this endpoint
    if user.role == "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Cannot create SUPER_ADMIN from team endpoint")
        
    new_user = await create_hashed_user(user, tenant_id)
    
    import json
    await db.auditlog.create(
        data={
            "tenantId": tenant_id,
            "userId": current_user_id.get() or "SYSTEM",
            "action": "CREATE_TEAM_MEMBER",
            "resource": "user",
            "resourceId": new_user.id,
            "changes": json.dumps({"email": user.email, "role": user.role})
        }
    )
    
    return new_user

@router.patch("/{user_id}")
async def update_team_member(user_id: str, user: TeamMemberUpdate, current_user: Any = Depends(require_roles(["ORG_ADMIN", "SUPER_ADMIN"]))):
    tenant_id = current_tenant_id.get()
    from infrastructure.tenantAwareRepository import user_repo
    # Verify user exists and belongs to this tenant
    existing = await user_repo.get_by_id(tenant_id, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role == "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Cannot assign SUPER_ADMIN role")
        
    data_to_update = {k: v for k, v in user.model_dump().items() if v is not None}
    
    updated = await user_repo.update(
        tenant_id=tenant_id,
        where={"id": user_id},
        data=data_to_update
    )
    
    import json
    await db.auditlog.create(
        data={
            "tenantId": tenant_id,
            "userId": current_user_id.get() or "SYSTEM",
            "action": "UPDATE_TEAM_MEMBER",
            "resource": "user",
            "resourceId": user_id,
            "changes": json.dumps(data_to_update)
        }
    )
    
    return updated

@router.post("/bulk-action")
async def bulk_team_action(payload: dict, current_user: Any = Depends(require_roles(["ORG_ADMIN", "SUPER_ADMIN"]))):
    # Support deactivate/activate
    action = payload.get("action")
    user_ids = payload.get("userIds", [])
    
    tenant_id = current_tenant_id.get()
    
    if action == "deactivate":
        target_status = False
    elif action == "activate":
        target_status = True
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    from infrastructure.tenantAwareRepository import user_repo
    # Verify all users belong to the tenant and update in one safe repository call
    updated = await user_repo.update(
        tenant_id=tenant_id,
        where={"id": {"in": user_ids}},
        data={"isActive": target_status}
    )
    
    return {"message": f"Successfully updated {updated} users"}
