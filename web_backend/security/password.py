import re
from fastapi import HTTPException

def validate_password_strength(password: str):
    """
    Validates that a password meets enterprise security requirements:
    - At least 8 characters long
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit
    - Contains at least one special character
    """
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
        
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
        
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
        
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character")
        
    return True
