from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from datetime import timedelta, datetime, timezone
from pydantic import BaseModel
import secrets

from src.database import db
from src.infrastructure.auth.permissions import has_permission
from src.infrastructure.audit.audit_logger import log_audit
from fastapi import Request
from src.api.dependencies import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = None
    token_type: str
    user: dict

class RefreshRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

from src.api.dependencies import limiter

import asyncio

@router.post("/login", response_model=TokenResponse)
@limiter.limit("500/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.user.find_unique(where={"email": form_data.username})
    
    if not user:
        import logging
        logging.getLogger(__name__).warning(f"Login failed: User not found for email {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if account is locked
    if user.lockedUntil and user.lockedUntil.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account locked due to too many failed login attempts. Try again later."
        )
        
    is_valid_password = await asyncio.to_thread(pwd_context.verify, form_data.password, user.passwordHash)
    if not is_valid_password:
        new_attempts = user.failedLoginAttempts + 1
        update_data = {"failedLoginAttempts": new_attempts}
        
        if new_attempts >= 5:
            update_data["lockedUntil"] = datetime.now(timezone.utc) + timedelta(minutes=15)
            
        await db.user.update(
            where={"id": user.id},
            data=update_data
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.isActive:
        raise HTTPException(status_code=400, detail="User account is inactive")
        
    if user.mfaEnabled:
        mfa_token = request.headers.get("X-MFA-Token")
        if not mfa_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA token required",
                headers={"X-MFA-Required": "true"}
            )
            
        import pyotp
        totp = pyotp.TOTP(user.mfaSecret)
        if not totp.verify(mfa_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA pin"
            )
        
    # Reset failed login attempts on successful login
    if user.failedLoginAttempts > 0:
        await db.user.update(
            where={"id": user.id},
            data={"failedLoginAttempts": 0}
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    role_str = getattr(user.role, "name", str(user.role)).replace("Role.", "")
    access_token = create_access_token(
        data={"sub": user.id, "tenantId": user.tenantId, "role": role_str},
        expires_delta=access_token_expires
    )
    
    # Generate Refresh Token
    refresh_token = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Store session
    await db.usersession.create(data={
        "tenantId": user.tenantId,
        "userId": user.id,
        "refreshToken": refresh_token,
        "ipAddress": request.client.host if request.client else "unknown",
        "userAgent": request.headers.get("user-agent", "unknown"),
        "expiresAt": expires_at
    })
    
    await log_audit(
        user_id=user.id,
        tenant_id=user.tenantId,
        action="LOGIN_SUCCESS",
        resource_type="User",
        resource_id=user.id,
        request=request
    )
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer", 
        "user": {
            "id": user.id, 
            "email": user.email, 
            "role": role_str, 
            "tenantId": user.tenantId,
            "firstName": user.firstName,
            "lastName": user.lastName
        }
    }

@router.post("/refresh")
async def refresh_token(request: Request, body: RefreshRequest):
    session = await db.usersession.find_unique(
        where={"refreshToken": body.refresh_token}, 
        include={"user": True}
    )
    
    if not session or session.isRevoked:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    # Session Hijacking Check
    current_ip = request.client.host if request.client else "unknown"
    current_agent = request.headers.get("user-agent", "unknown")
    if session.ipAddress != current_ip or session.userAgent != current_agent:
        # Revoke the hijacked session
        await db.usersession.update(
            where={"id": session.id},
            data={"isRevoked": True}
        )
        import logging
        logging.getLogger(__name__).warning(f"Session hijack prevented for user {session.userId}")
        raise HTTPException(status_code=403, detail="Suspicious activity detected. Session revoked.")
        
    if session.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")
        
    if not session.user.isActive:
        raise HTTPException(status_code=400, detail="User account is inactive")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    role_str = getattr(session.user.role, "name", str(session.user.role)).replace("Role.", "")
    access_token = create_access_token(
        data={"sub": session.user.id, "tenantId": session.user.tenantId, "role": role_str},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from src.api.dependencies import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

@router.post("/logout")
async def logout(body: RefreshRequest, token: str = Depends(oauth2_scheme)):
    # 1. Revoke Refresh Token
    session = await db.usersession.find_unique(where={"refreshToken": body.refresh_token})
    if session:
        await db.usersession.update(
            where={"id": session.id},
            data={"isRevoked": True}
        )
        
    # 2. Blocklist Access Token
    if token:
        try:
            # Decode without verifying expiration (if it's expired, it doesn't matter, but we can't let JWTError block us)
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                remaining_ttl = int(exp - datetime.now(timezone.utc).timestamp())
                if remaining_ttl > 0:
                    from fastapi_cache import FastAPICache
                    backend = FastAPICache.get_backend()
                    if backend and hasattr(backend, "redis"):
                        await backend.redis.setex(f"jwt_blocklist:{jti}", remaining_ttl, "true")
        except JWTError:
            pass # Invalid token format
            
    return {"message": "Logged out successfully"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": getattr(current_user.role, "name", str(current_user.role)).replace("Role.", ""),
        "tenantId": current_user.tenantId,
        "firstName": current_user.firstName,
        "lastName": current_user.lastName
    }

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, current_user = Depends(get_current_user)):
    user = await db.user.find_unique(where={"id": current_user.id})
    
    is_valid_password = await asyncio.to_thread(pwd_context.verify, req.current_password, user.passwordHash)
    if not is_valid_password:
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    hashed_pw = await asyncio.to_thread(pwd_context.hash, req.new_password)
    
    await db.user.update(
        where={"id": user.id},
        data={"passwordHash": hashed_pw}
    )
    
    await log_audit(
        user_id=user.id,
        tenant_id=user.tenantId,
        action="PASSWORD_CHANGED",
        resource_type="User",
        resource_id=user.id
    )
    
    return {"message": "Password updated successfully"}
