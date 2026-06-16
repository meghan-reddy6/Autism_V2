from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Optional, Any
import random
import joblib
import pandas as pd
import os
import shap
import numpy as np
from train_model import generate_synthetic_data
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import logging
import json
from datetime import datetime
import yaml

# Structured logger for ML inference
class MLJSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
        }
        if hasattr(record, "trace_id"):
            log_obj["trace_id"] = record.trace_id
        if hasattr(record, "inference_data"):
            log_obj["inference_data"] = record.inference_data
        return json.dumps(log_obj)

logger = logging.getLogger("ml_service")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(MLJSONFormatter())
logger.addHandler(handler)

with open("../config/scoring_thresholds.yaml", "r") as f:
    SCORING_CONFIG = yaml.safe_load(f)["scales"]

app = FastAPI(title="Clinical ML Engine (Explainable AI)")

MODEL_PATH = "rf_model.joblib"
model = None

def load_model():
    global model
    try:
        if os.path.exists(MODEL_PATH):
            model = joblib.load(MODEL_PATH)
            print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")

load_model()

class InferenceRequest(BaseModel):
    scale_type: str
    normalized_score: float
    age_months: int
    features: Optional[Dict[str, int]] = None
    trace_id: Optional[str] = None

def generate_trajectory(current_risk: str) -> list:
    # A mock trajectory forecaster
    # In a real CDSS, this would use a sequential model (e.g. LSTM or HMM)
    if current_risk in ["High", "Very High"]:
        return [
            {"month": 1, "predicted_risk": current_risk},
            {"month": 3, "predicted_risk": "Moderate" if random.random() > 0.5 else current_risk},
            {"month": 6, "predicted_risk": "Moderate"}
        ]
    return [
        {"month": 1, "predicted_risk": current_risk},
        {"month": 3, "predicted_risk": current_risk},
        {"month": 6, "predicted_risk": current_risk}
    ]

@app.post("/analyze")
async def analyze_score(request: InferenceRequest):
    # Schema validation against config
    if request.scale_type not in SCORING_CONFIG:
        logger.warning(f"Unknown scale type: {request.scale_type}", extra={"trace_id": request.trace_id})
    else:
        # Validate schema bounds
        scale_config = SCORING_CONFIG[request.scale_type]
        max_possible = max([v[1] for v in scale_config.values() if isinstance(v, list) and len(v) == 2])
        if request.normalized_score > max_possible or request.normalized_score < 0:
            logger.error(f"Schema Drift Detected: Normalized score {request.normalized_score} is out of bounds for {request.scale_type}.", extra={"trace_id": request.trace_id})
    if model is None:
        # Fallback if model not trained
        confidence = round(random.uniform(0.75, 0.95), 4)
        if request.scale_type == "CARS":
            observation = "High" if request.normalized_score >= 30 else "Low"
        elif request.scale_type == "GARS-2":
            observation = "High" if request.normalized_score >= 50 else "Low"
        else: # M-CHAT-R
            observation = "High" if request.normalized_score >= 8 else ("Moderate" if request.normalized_score >= 3 else "Low")
            
        return {
            "risk_level": observation,
            "confidence_score": confidence,
            "shap_breakdown": {
                "cars_1": random.uniform(1.0, 5.0),
                "cars_2": random.uniform(1.0, 4.0),
                "age_months": random.uniform(0.5, 3.0),
                "cars_6": random.uniform(0.5, 2.5),
                "cars_10": random.uniform(0.2, 1.5)
            },
            "trajectory_forecast": generate_trajectory(observation),
            "model_version": "v0.0.0-mock",
        }
        
    # Prepare data for prediction
    df = pd.DataFrame([{
        "scale_type": request.scale_type,
        "normalized_score": request.normalized_score,
        "age_months": request.age_months
    }])
    
    # Predict
    prediction_raw = model.predict(df)[0]
    # Map raw prediction to Risk Levels
    if "Elevated" in prediction_raw:
        risk_level = "High"
    elif "Moderate" in prediction_raw:
        risk_level = "Moderate"
    else:
        risk_level = "Low"
    
    # Get confidence (probability of predicted class)
    probabilities = model.predict_proba(df)[0]
    confidence = round(float(max(probabilities)), 4)
    
    # SHAP Explainability
    shap_breakdown = {}
    try:
        classifier = model.named_steps['classifier']
        preprocessor = model.named_steps['preprocessor']
        
        # Transform the single instance
        transformed_instance = preprocessor.transform(df)
        
        explainer = shap.TreeExplainer(classifier)
        shap_values = explainer.shap_values(transformed_instance)
        
        # Determine the target class index we are explaining
        class_idx = list(classifier.classes_).index(prediction_raw)
        
        # In newer SHAP versions for RF, shap_values is a list of arrays for each class
        # or a single 3D array. We handle accordingly.
        if isinstance(shap_values, list):
            instance_shap = shap_values[class_idx][0]
        elif len(shap_values.shape) == 3:
            instance_shap = shap_values[:, :, class_idx][0]
        else:
            instance_shap = shap_values[0]
            
        # We know we have 2 main numerical features: normalized_score, age_months
        # The categorical one is OHE. Let's extract the rough importance
        # Map back to basic names for the API
        cat_features = preprocessor.named_transformers_['cat'].get_feature_names_out(['scale_type'])
        num_features = ['normalized_score', 'age_months']
        all_features = list(cat_features) + num_features
        
        # Build breakdown
        total_abs_shap = np.sum(np.abs(instance_shap))
        if total_abs_shap > 0:
            for feat_name, shap_val in zip(all_features, instance_shap):
                # We group the categorical ones into "scale_type"
                clean_name = "scale_type" if feat_name.startswith("scale_type") else feat_name
                if clean_name not in shap_breakdown:
                    shap_breakdown[clean_name] = 0.0
                shap_breakdown[clean_name] += abs(float(shap_val))
                
            # Normalize to percentages
            for k in shap_breakdown.keys():
                shap_breakdown[k] = round((shap_breakdown[k] / total_abs_shap) * 100, 2)
                
    except Exception as e:
        print(f"SHAP explanation failed: {e}")
        # fallback to empty breakdown

    response_data = {
        "risk_level": risk_level,
        "confidence_score": confidence,
        "shap_breakdown": shap_breakdown,
        "trajectory_forecast": generate_trajectory(risk_level),
        "model_version": "v2.0.0-rf-shap",
    }
    
    logger.info("Inference completed", extra={
        "trace_id": request.trace_id,
        "inference_data": {
            "inputs": {"scale": request.scale_type, "score": request.normalized_score, "age": request.age_months},
            "outputs": response_data
        }
    })
    
    return response_data