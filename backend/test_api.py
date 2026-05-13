import requests

# We don't have a valid token easily, but we can see if it returns 401 or 500
try:
    # Try a GET request to a public endpoint if any, or just hit the 500 one
    url = "http://localhost:8001/api/assignments/request"
    resp = requests.post(url, json={})
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
