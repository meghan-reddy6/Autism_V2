import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
import joblib

def generate_synthetic_data(num_samples=1000):
    data = []
    
    # Generate CARS
    for _ in range(num_samples):
        score = np.random.randint(15, 60)
        age = np.random.randint(24, 216) # 2-18 years
        # Threshold: score >= 30 is Elevated
        target = "Elevated Statistical Observation" if score >= 30 else "Standard Statistical Observation"
        # add some noise (5%)
        if np.random.rand() < 0.05:
            target = "Standard Statistical Observation" if target == "Elevated Statistical Observation" else "Elevated Statistical Observation"
        data.append(["CARS", score, age, target])
        
    # Generate GARS-2
    for _ in range(num_samples):
        score = np.random.randint(0, 126) # 42 items, 0-3
        age = np.random.randint(36, 216) # 3-18 years
        # Threshold: score >= 50 is Elevated
        target = "Elevated Statistical Observation" if score >= 50 else "Standard Statistical Observation"
        if np.random.rand() < 0.05:
             target = "Standard Statistical Observation" if target == "Elevated Statistical Observation" else "Elevated Statistical Observation"
        data.append(["GARS-2", score, age, target])
        
    # Generate M-CHAT-R
    for _ in range(num_samples):
        score = np.random.randint(0, 20)
        age = np.random.randint(16, 30) # 16-30 months
        # Threshold: score >= 3 is Elevated
        target = "Elevated Statistical Observation" if score >= 3 else "Standard Statistical Observation"
        if np.random.rand() < 0.05:
             target = "Standard Statistical Observation" if target == "Elevated Statistical Observation" else "Elevated Statistical Observation"
        data.append(["M-CHAT-R", score, age, target])

    df = pd.DataFrame(data, columns=["scale_type", "normalized_score", "age_months", "observation"])
    return df

def train_model():
    print("Generating synthetic clinical data...")
    # Seed for reproducibility
    np.random.seed(42)
    df = generate_synthetic_data(5000)
    
    X = df[["scale_type", "normalized_score", "age_months"]]
    y = df["observation"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['scale_type']),
            ('num', StandardScaler(), ['normalized_score', 'age_months'])
        ])
        
    clf = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    print("Training Random Forest Classifier...")
    clf.fit(X, y)
    
    # Quick eval on train set
    acc = clf.score(X, y)
    print(f"Training Accuracy: {acc:.4f}")
    
    print("Saving model to rf_model.joblib...")
    joblib.dump(clf, "rf_model.joblib")
    print("Model saved successfully.")

if __name__ == "__main__":
    train_model()
