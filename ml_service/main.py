from fastapi import FastAPI
from pydantic import BaseModel
import random
import joblib
import pandas as pd
import httpx
import os
from train_model import generate_synthetic_data
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

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
        "model_version": "v1.0.0-rf-active-learning",
        "disclaimer": "This is an ML-based statistical observation intended for decision support only and is not a medical diagnosis."
    }

@app.post("/retrain")
async def retrain_model_endpoint():
    global model
    try:
        async with httpx.AsyncClient() as client:
            # Communicate internally inside Docker network
            response = await client.get("http://web-backend:8000/api/ml/training-data", timeout=10.0)
            if response.status_code != 200:
                return {"error": f"Failed to fetch feedback data: {response.text}"}
            feedbacks = response.json()
    except Exception as e:
        return {"error": f"Failed to connect to web backend: {e}"}
        
    print(f"Retrieved {len(feedbacks)} real-world feedback records.")
    
    # Generate base synthetic data to prevent catastrophic forgetting
    df_synthetic = generate_synthetic_data(5000)
    
    # Process the doctor feedback data
    feedback_rows = []
    for fb in feedbacks:
        if fb.get("doctorAgreement") is True:
            target = fb.get("predictedRisk")
        else:
            # Simplistic Active Learning: Flip the target class if doctor disagreed
            target = "Standard Statistical Observation" if "Elevated" in fb.get("predictedRisk", "") else "Elevated Statistical Observation"
            
        feedback_rows.append([
            fb.get("scaleType"),
            fb.get("totalScore"),
            fb.get("ageMonths"),
            target
        ])
        
    if feedback_rows:
        df_feedback = pd.DataFrame(feedback_rows, columns=["scaleType", "totalScore", "ageMonths", "predictedRisk"])
        df_feedback = df_feedback.rename(columns={"scaleType": "scale_type", "totalScore": "normalized_score", "ageMonths": "age_months", "predictedRisk": "observation"})
        
        # Combine historical synthetic data with real clinical feedback
        # Real feedback could be oversampled here to weigh heavier, but we append for MVP
        df_combined = pd.concat([df_synthetic, df_feedback], ignore_index=True)
    else:
        df_combined = df_synthetic
        
    # Retrain pipeline
    X = df_combined[["scale_type", "normalized_score", "age_months"]]
    y = df_combined["observation"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['scale_type']),
            ('num', StandardScaler(), ['normalized_score', 'age_months'])
        ])
        
    clf = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    clf.fit(X, y)
    
    # Overwrite the active model
    joblib.dump(clf, MODEL_PATH)
    
    # Hot-swap the model in memory
    model = clf
    
    return {
        "status": "success",
        "message": f"Model retrained successfully using {len(df_synthetic)} synthetic records and {len(feedback_rows)} real-world clinical feedback validations."
    }