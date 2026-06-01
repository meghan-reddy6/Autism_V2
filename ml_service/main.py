from fastapi import FastAPI
from pydantic import BaseModel
import random
import joblib
import pandas as pd
import os

app = FastAPI(title="Clinical ML Engine")

MODEL_PATH = "rf_model.joblib"
try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
    else:
        model = None
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

class InferenceRequest(BaseModel):
    scale_type: str
    normalized_score: float
    age_months: int

@app.post("/analyze")
async def analyze_score(request: InferenceRequest):
    if model is None:
        # Fallback if model not trained
        confidence = round(random.uniform(0.75, 0.95), 4)
        if request.scale_type == "CARS":
            observation = "Elevated Statistical Observation" if request.normalized_score >= 30 else "Standard Statistical Observation"
        elif request.scale_type == "GARS-2":
            observation = "Elevated Statistical Observation" if request.normalized_score >= 50 else "Standard Statistical Observation"
        else:
            observation = "Elevated Statistical Observation" if request.normalized_score >= 3 else "Standard Statistical Observation"
            
        return {
            "observation": observation,
            "confidence_score": confidence,
            "model_version": "v0.0.0-mock",
            "disclaimer": "This is a statistical observation intended for decision support only and is not a medical diagnosis."
        }
        
    # Prepare data for prediction
    df = pd.DataFrame([{
        "scale_type": request.scale_type,
        "normalized_score": request.normalized_score,
        "age_months": request.age_months
    }])
    
    # Predict
    prediction = model.predict(df)[0]
    
    # Get confidence (probability of predicted class)
    probabilities = model.predict_proba(df)[0]
    confidence = round(float(max(probabilities)), 4)
    
    return {
        "observation": prediction,
        "confidence_score": confidence,
        "model_version": "v1.0.0-rf",
        "disclaimer": "This is an ML-based statistical observation intended for decision support only and is not a medical diagnosis."
    }