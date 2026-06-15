from unittest.mock import AsyncMock, patch

def test_list_sessions(client):
    with patch('domains.patients.assessment_sessions.db') as mock_db:
        mock_db.assessmentsession.find_many = AsyncMock(return_value=[])
        response = client.get("/api/v1/assessment-sessions")
        assert response.status_code == 200
        assert response.json() == []

def test_create_session_no_template(client):
    with patch('domains.patients.assessment_sessions.db') as mock_db:
        mock_db.assessmenttemplate.find_first = AsyncMock(return_value=None)
        response = client.post("/api/v1/assessment-sessions", json={"patientId": "p1", "scaleType": "UNKNOWN"})
        assert response.status_code == 400
        assert "Template not found" in response.json()["detail"]

def test_create_session_success(client):
    with patch('domains.patients.assessment_sessions.db') as mock_db, \
         patch('domains.patients.assessment_sessions.send_assessment_link', new_callable=AsyncMock) as mock_email:
        
        # Mock template
        class MockTemplate:
            id = "t1"
        mock_db.assessmenttemplate.find_first = AsyncMock(return_value=MockTemplate())
        
        # Mock session
        class MockSession:
            id = "s1"
        mock_db.assessmentsession.create = AsyncMock(return_value=MockSession())
        
        # Mock Patient
        class MockPatient:
            firstName = "John"
            lastName = "Doe"
            guardianEmail = "test@example.com"
        mock_db.patient.find_unique = AsyncMock(return_value=MockPatient())
        
        response = client.post("/api/v1/assessment-sessions", json={"patientId": "p1", "scaleType": "CARS"})
        
        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert data["id"] == "s1"
        
        # Verify email was called
        mock_email.assert_called_once()
