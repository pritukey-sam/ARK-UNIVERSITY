from fastapi.testclient import TestClient
from main import app
from auth import generate_token

client = TestClient(app)
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBsdW1pbmEuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzc3MTEwMTgwfQ.9iZpXIMKGTXMOEF2kskT_E_eLgrbPDg4BvlPn7OB7uk"

try:
    response = client.get("/api/progress/module/1/1", headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {response.status_code}")
    print(response.json())
except Exception as e:
    import traceback
    traceback.print_exc()
