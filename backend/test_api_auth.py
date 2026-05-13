import sys
import os
sys.path.append(os.getcwd())
from auth import generate_token
import requests

# Generate a token for an admin (assuming user_id 1 exists)
token = generate_token(user_id=1, email="admin@test.com", role="admin", company_id=1)

url = "http://localhost:8001/api/assignments/request"
headers = {"Authorization": f"Bearer {token}"}
payload = {
    "user_id": 1,
    "course_id": 1,
    "hr_id": 1,
    "note": "Test note"
}

try:
    resp = requests.post(url, json=payload, headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
