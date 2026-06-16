from pydantic import BaseModel
from typing import Optional
import bcrypt
from src.database import db

class UserUpdateBase(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    isActive: Optional[bool] = None

async def create_hashed_user(user_data, tenant_id: str):
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(user_data.password.encode('utf-8'), salt).decode('utf-8')
    
    new_user = await db.user.create(
        data={
            "email": user_data.email,
            "passwordHash": hashed_pw,
            "firstName": user_data.firstName,
            "lastName": user_data.lastName,
            "role": user_data.role,
            "tenantId": tenant_id
        }
    )
    return new_user
