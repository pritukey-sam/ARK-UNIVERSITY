import urllib.request
from urllib.error import HTTPError

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBsdW1pbmEuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzc3MTEwMTgwfQ.9iZpXIMKGTXMOEF2kskT_E_eLgrbPDg4BvlPn7OB7uk"
req = urllib.request.Request("http://localhost:8000/api/progress/module/1/1", headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except HTTPError as e:
    print(e.read().decode())
