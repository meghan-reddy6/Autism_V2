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
    if model is None:
        # Fallback if model not trained
        confidence = round(random.uniform(0.75, 0.95), 4)
        if request.scale_type == "CARS":
            observation = "High" if request.normalized_score >= 30 else "Low"
        elif request.scale_type == "GARS-2":
            observation = "High" if request.normalized_score >= 50 else "Low"
        else:
            observation = "High" if request.normalized_score >= 3 else "Low"
            
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
    risk_level = "High" if "Elevated" in prediction_raw else "Low"
    
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

    return {
        "risk_level": risk_level,
        "confidence_score": confidence,
        "shap_breakdown": shap_breakdown,
        "trajectory_forecast": generate_trajectory(risk_level),
        "model_version": "v2.0.0-rf-shap",
    }