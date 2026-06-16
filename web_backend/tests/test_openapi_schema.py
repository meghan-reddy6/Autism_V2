import pytest
from src.main import app
from fastapi.testclient import TestClient

def test_openapi_schema_snapshot(snapshot):
    client = TestClient(app)
    response = client.get("/openapi.json")
    assert response.status_code == 200
    
    schema = response.json()
    # To prevent timestamps or dynamic variables from failing the snapshot:
    # Filter out or assert structural elements. We will snapshot the whole schema.
    assert schema == snapshot
