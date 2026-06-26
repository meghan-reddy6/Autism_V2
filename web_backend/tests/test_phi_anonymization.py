import pytest
from src.schemas.assessment import PublicAssessmentIngestion, AssessmentResponseItem

def test_phi_dropped_during_sanitization():
    payload = {
        "responses": [
            {"fieldName": "mchat_1", "value": 0},
            {"fieldName": "mchat_2", "value": 1}
        ],
        "patientName": "John Doe",
        "patientEmail": "john@example.com",
        "patientPhone": "555-0100"
    }
    
    ingestion = PublicAssessmentIngestion(**payload)
    
    # Generate anonymized payload
    anonymized = ingestion.get_anonymized_payload(scale_type="M-CHAT-R", age_months=24)
    
    # Ensure raw ePHI is NOT in the output payload
    assert "patientName" not in anonymized
    assert "patientEmail" not in anonymized
    assert "patientPhone" not in anonymized
    
    # Ensure it only has allowed fields
    assert "temp_hash" in anonymized
    assert "features" in anonymized
    assert "scale_type" in anonymized
    assert "normalized_score" in anonymized
    assert "age_months" in anonymized
    
    # Ensure numeric markers are present
    assert anonymized["features"]["mchat_1"] == 1 # "No" -> 1 for mchat_1
    assert anonymized["features"]["mchat_2"] == 1 # "Yes" -> 1 for mchat_2
