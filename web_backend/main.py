import httpx
import yaml
import os
from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from prisma import Prisma, Json
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone

app = FastAPI(title="Clinical SaaS Core API")
db = Prisma()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

with open("../config/scoring_thresholds.yaml", "r") as f:
    THRESHOLDS = yaml.safe_load(f)

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8001/analyze")

# --- AUTH SETUP ---
SECRET_KEY = "super-secret-key-for-mvp"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await db.user.find_unique(where={"id": user_id})
    if user is None:
        raise credentials_exception
    return user
# ------------------

@app.on_event("startup")
async def startup():
    await db.connect()
    
    try:
        tenant = await db.tenant.find_first(where={"name": "Default Clinic"})
        if not tenant:
            tenant = await db.tenant.create(data={"name": "Default Clinic"})
            hashed_pw = pwd_context.hash("password123")
            await db.user.create(data={
                "tenantId": tenant.id,
                "email": "doctor@defaultclinic.com",
                "role": "DOCTOR",
                "passwordHash": hashed_pw
            })
    except Exception as e:
        print(f"Skipping database seeding - schema might not be pushed yet: {e}")

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.user.find_unique(where={"email": form_data.username})
    if not user or not pwd_context.verify(form_data.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id, "tenantId": user.tenantId, "role": user.role},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {"id": user.id, "email": user.email, "role": user.role, "tenantId": user.tenantId}
    }

class PreliminaryReportPayload(BaseModel):
    clinician_id: str
    scale_type: str
    item_scores: Dict[str, int]
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: str
    parent_name: Optional[str] = None
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None
    lifestyle_info: Optional[str] = None
    symptoms: Optional[list] = None
    doctor_notes: Optional[str] = None

def calculate_age_months(dob: datetime) -> int:
    today = datetime.now(timezone.utc)
    dob = dob.replace(tzinfo=timezone.utc) if dob.tzinfo is None else dob
    months = (today.year - dob.year) * 12 + today.month - dob.month
    if today.day < dob.day:
        months -= 1
    return max(0, months)

def get_deterministic_risk(scale: str, score: float) -> str:
    scale_config = THRESHOLDS.get("scales", {}).get(scale)
    if not scale_config:
        return "Unknown Scale"
    for risk_level, (low, high) in scale_config.items():
        if low <= score <= high:
            return risk_level.replace("_", " ").title()
    return "Out of Range"

@app.post("/api/reports/preliminary")
async def generate_preliminary_report(payload: PreliminaryReportPayload, current_user: Any = Depends(get_current_user)):
    total_score = sum(payload.item_scores.values())
    
    tenant_id = current_user.tenantId
    
    age_months = calculate_age_months(payload.date_of_birth)
    
    patient = await db.patient.create(data={
        "tenantId": tenant_id,
        "firstName": payload.first_name,
        "lastName": payload.last_name,
        "dateOfBirth": payload.date_of_birth,
        "gender": payload.gender,
        "parentName": payload.parent_name,
        "contactNumber": payload.contact_number
    })

    ml_payload = {
        "scale_type": payload.scale_type,
        "normalized_score": total_score,
        "age_months": age_months
    }
    
    ml_metadata = {"status": "unavailable"}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(ML_SERVICE_URL, json=ml_payload, timeout=3.0)
            if response.status_code == 200:
                ml_metadata = response.json()
    except Exception as e:
        print(f"ML Warning: {e}")

    report = await db.clinicalreport.create(data={
        "tenant": {"connect": {"id": tenant_id}},
        "patient": {"connect": {"id": patient.id}},
        "author": {"connect": {"id": current_user.id}},
        "scaleType": payload.scale_type,
        "itemScores": Json(payload.item_scores),
        "totalScore": total_score,
        "status": "PENDING_REVIEW",
        "mlRiskMetadata": Json(ml_metadata),
        "medicalHistory": payload.medical_history,
        "lifestyleInfo": payload.lifestyle_info,
        "symptoms": Json(payload.symptoms) if payload.symptoms else None,
        "doctorNotes": payload.doctor_notes
    })
    
    return {
        "status": "success",
        "report_id": report.id,
        "deterministic_score": total_score,
        "deterministic_risk": get_deterministic_risk(payload.scale_type, total_score),
        "decision_support": ml_metadata
    }

@app.get("/api/reports/{report_id}")
async def get_report(report_id: str, current_user: Any = Depends(get_current_user)):
    report = await db.clinicalreport.find_first(
        where={"id": report_id, "tenantId": current_user.tenantId},
        include={"patient": True, "author": True}
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@app.get("/api/reports")
async def get_all_reports(current_user: Any = Depends(get_current_user)):
    reports = await db.clinicalreport.find_many(
        where={"tenantId": current_user.tenantId},
        include={"patient": True, "author": True},
        order={"createdAt": "desc"}
    )
    return reports

@app.get("/api/patients/{patient_id}/reports")
async def get_patient_reports(patient_id: str, current_user: Any = Depends(get_current_user)):
    reports = await db.clinicalreport.find_many(
        where={"patientId": patient_id, "tenantId": current_user.tenantId},
        include={"author": True},
        order={"createdAt": "desc"}
    )
    patient = await db.patient.find_unique(where={"id": patient_id})
    if not patient or patient.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    return {
        "patient": patient,
        "reports": reports
    }