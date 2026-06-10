from fastapi.testclient import TestClient
from main import app

def test_secure_headers():
    client = TestClient(app)
    # The healthcheck endpoint should return secure headers
    response = client.get("/health")
    assert response.status_code == 200
    
    headers = response.headers
    assert headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains; preload"
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
