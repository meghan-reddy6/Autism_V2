import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_mchat_r_low_risk_inference():
    response = client.post("/analyze", json={
        "scale_type": "M-CHAT-R",
        "normalized_score": 1,
        "age_months": 24
    })
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "Low"

def test_mchat_r_moderate_risk_inference():
    response = client.post("/analyze", json={
        "scale_type": "M-CHAT-R",
        "normalized_score": 5,
        "age_months": 24
    })
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "Moderate"

def test_mchat_r_high_risk_inference():
    response = client.post("/analyze", json={
        "scale_type": "M-CHAT-R",
        "normalized_score": 12,
        "age_months": 24
    })
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "High"
