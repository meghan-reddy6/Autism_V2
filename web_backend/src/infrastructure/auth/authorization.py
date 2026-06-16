from fastapi import Depends, HTTPException, status
from typing import Any
from src.infrastructure.auth.permissions import has_permission

def require_permission(required_permission: str):
    """
    Dependency to check if the current user has a specific granular permission.
    Must be used AFTER authentication (i.e. depends on get_current_user).
    """
    # Import locally to avoid circular imports since get_current_user is in dependencies.py
    from src.api.dependencies import get_current_user
    
    async def permission_checker(current_user: Any = Depends(get_current_user)):
        print(f"DEBUG ROLE: type={type(current_user.role)} value={current_user.role}")
        if not has_permission(current_user.role, required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required permission: {required_permission}. Your role: {current_user.role} (Type: {type(current_user.role)})"
            )
        return current_user
        
    return permission_checker
