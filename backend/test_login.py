import urllib.request
from urllib.error import HTTPError
import json

data = json.dumps({"email": "admin@lumina.com", "password": "password123"}).encode('utf-8')
req = urllib.request.Request(
    "http://localhost:8000/api/login",
    data=data,
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except HTTPError as e:
    print("Error:", e.read().decode())
except Exception as e:
    print("Exception:", str(e))
