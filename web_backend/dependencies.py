from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from prisma import Prisma
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

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
        import logging
        logger = logging.getLogger(__name__)
        if request:
            logger.warning(f"Unauthenticated access attempt to {request.url.path}")
        raise credentials_exception

    user_id = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        import logging
        logger = logging.getLogger(__name__)
        if request:
            logger.warning(f"Invalid token access attempt to {request.url.path}")
        raise credentials_exception
        
    user = await db.user.find_unique(where={"id": user_id})
    if user is None:
        raise credentials_exception
    if not user.isActive:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

ROLE_HIERARCHY = {
    "SUPER_ADMIN": 100,
    "PLATFORM_ADMIN": 90,
    "TENANT_ADMIN": 80,
    "CLINICAL_ADMIN": 70,
    "SUPERVISOR": 60,
    "THERAPIST": 50,
    "ASSESSOR": 40,
    "DATA_ENTRY": 30,
    "VIEWER": 20
}

def require_roles(minimum_role_or_roles):
    """RBAC Dependency generator supporting hierarchy or exact match list"""
    async def role_checker(current_user = Depends(get_current_user)):
        # Prisma may return role as an Enum or string
        user_role_str = getattr(current_user.role, "name", str(current_user.role))
        if user_role_str.startswith("Role."):
            user_role_str = user_role_str.replace("Role.", "")
            
        user_level = ROLE_HIERARCHY.get(user_role_str, 0)
        
        if isinstance(minimum_role_or_roles, list):
            # Support legacy exact match lists during transition
            allowed = minimum_role_or_roles
            # Also map old roles to new just in case
            legacy_map = {
                "DOCTOR": "CLINICAL_ADMIN",
                "CLINIC_ADMIN": "TENANT_ADMIN",
                "PSYCHOLOGIST": "SUPERVISOR",
                "RECEPTIONIST": "DATA_ENTRY",
                "PATIENT_PARENT": "VIEWER"
            }
            allowed = [legacy_map.get(r, r) for r in allowed]
            if user_role_str not in allowed and user_level < ROLE_HIERARCHY["SUPER_ADMIN"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted"
                )
        else:
            required_level = ROLE_HIERARCHY.get(minimum_role_or_roles, 0)
            if user_level < required_level:
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
