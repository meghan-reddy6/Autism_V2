from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from prisma import Prisma
from datetime import datetime, timedelta, timezone
from typing import Optional, List

# Move db instantiation to a central place, or just pass it around.
# Actually, since Prisma needs async db connection, we can instantiate it here, 
# but usually it's better to have a central `db.py` or import it.
# Let's assume `db` will be instantiated globally in main and imported, or vice versa.
# To avoid circular imports, let's create a database.py

SECRET_KEY = "super-secret-key-for-enterprise"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), request: Request = None):
    # We must import db here to avoid circular imports if db is defined in database.py
    from database import db
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if token is None:
        if request:
            await db.auditlog.create(data={
                "tenantId": "SYSTEM",
                "userId": "UNAUTHENTICATED",
                "action": "MISSING_TOKEN_ACCESS_ATTEMPT",
                "resource": "API_ROUTE",
                "resourceId": request.url.path,
                "ipAddress": request.client.host if request.client else "unknown"
            })
        raise credentials_exception

    user_id = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        if request:
            await db.auditlog.create(data={
                "tenantId": "SYSTEM",
                "userId": "UNAUTHENTICATED",
                "action": "UNAUTHORIZED_ACCESS_ATTEMPT",
                "resource": "API_ROUTE",
                "resourceId": request.url.path,
                "ipAddress": request.client.host if request.client else "unknown"
            })
        raise credentials_exception
        
    user = await db.user.find_unique(where={"id": user_id})
    if user is None:
        raise credentials_exception
    if not user.isActive:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def require_roles(allowed_roles: List[str]):
    """RBAC Dependency generator"""
    async def role_checker(current_user = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    return role_checker

async def get_current_user_or_none(token: str = Depends(oauth2_scheme)):
    if not token:
        return None
    try:
        from database import db
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            user = await db.user.find_unique(where={"id": user_id})
            if user and user.isActive:
                return user
    except Exception:
        pass
    return None

async def validate_assessment_token(token: str):
    from database import db
    session = await db.assessmentsession.find_unique(
        where={"token": token},
        include={"template": True, "patient": True}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    if session.expiresAt and session.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token has expired")
    return session
