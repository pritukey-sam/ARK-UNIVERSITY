import sys
import os
sys.path.append(os.getcwd())
from auth import generate_token
import requests

token = generate_token(user_id=1, email="admin@test.com", role="admin", company_id=1)

url = "http://localhost:8001/api/dashboard/activity"
headers = {"Authorization": f"Bearer {token}"}

try:
    resp = requests.get(url, headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
