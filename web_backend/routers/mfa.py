import pyotp
import qrcode
import io
import base64
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import db
from dependencies import get_current_user

router = APIRouter(prefix="/api/v1/mfa", tags=["mfa"])

class VerifyRequest(BaseModel):
    pin: str

@router.post("/setup")
async def setup_mfa(current_user = Depends(get_current_user)):
    if current_user.mfaEnabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled")
        
    secret = pyotp.random_base32()
    
    await db.user.update(
        where={"id": current_user.id},
        data={"mfaSecret": secret}
    )
    
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name="Horizon Health Clinic")
    
    # Generate QR Code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{img_str}"
    }

@router.post("/verify")
async def verify_mfa(request: VerifyRequest, current_user = Depends(get_current_user)):
    if not current_user.mfaSecret:
        raise HTTPException(status_code=400, detail="MFA setup has not been initiated")
        
    totp = pyotp.TOTP(current_user.mfaSecret)
    if not totp.verify(request.pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA pin")
        
    if not current_user.mfaEnabled:
        await db.user.update(
            where={"id": current_user.id},
            data={"mfaEnabled": True}
        )
        
    return {"message": "MFA verified successfully", "mfaEnabled": True}

@router.post("/disable")
async def disable_mfa(request: VerifyRequest, current_user = Depends(get_current_user)):
    if not current_user.mfaEnabled or not current_user.mfaSecret:
        raise HTTPException(status_code=400, detail="MFA is not enabled")
        
    # Require current pin to disable
    totp = pyotp.TOTP(current_user.mfaSecret)
    if not totp.verify(request.pin):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA pin")
        
    await db.user.update(
        where={"id": current_user.id},
        data={"mfaEnabled": False, "mfaSecret": None}
    )
    
    return {"message": "MFA disabled successfully"}
