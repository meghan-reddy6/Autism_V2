from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from datetime import timedelta, datetime, timezone
from pydantic import BaseModel
import secrets

from database import db
from dependencies import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = None
    token_type: str
    user: dict

class RefreshRequest(BaseModel):
    refresh_token: str

from dependencies import limiter

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.user.find_unique(where={"email": form_data.username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not pwd_context.verify(form_data.password, user.passwordHash):
        await db.user.update(
            where={"id": user.id},
            data={"failedLoginAttempts": {"increment": 1}}
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
    access_token = create_access_token(
        data={"sub": user.id, "tenantId": user.tenantId, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # Generate Refresh Token
    refresh_token = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Store session
    await db.usersession.create(data={
        "userId": user.id,
        "refreshToken": refresh_token,
        "ipAddress": request.client.host if request.client else "unknown",
        "userAgent": request.headers.get("user-agent", "unknown"),
        "expiresAt": expires_at
    })
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer", 
        "user": {
            "id": user.id, 
            "email": user.email, 
            "role": user.role, 
            "tenantId": user.tenantId,
            "firstName": user.firstName,
            "lastName": user.lastName
        }
    }

@router.post("/refresh")
async def refresh_token(request: RefreshRequest):
    session = await db.usersession.find_unique(
        where={"refreshToken": request.refresh_token}, 
        include={"user": True}
    )
    
    if not session or session.isRevoked:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    if session.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")
        
    if not session.user.isActive:
        raise HTTPException(status_code=400, detail="User account is inactive")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": session.user.id, "tenantId": session.user.tenantId, "role": session.user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(request: RefreshRequest):
    session = await db.usersession.find_unique(where={"refreshToken": request.refresh_token})
    if session:
        await db.usersession.update(
            where={"id": session.id},
            data={"isRevoked": True}
        )
    return {"message": "Logged out successfully"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "tenantId": current_user.tenantId,
        "firstName": current_user.firstName,
        "lastName": current_user.lastName
    }
