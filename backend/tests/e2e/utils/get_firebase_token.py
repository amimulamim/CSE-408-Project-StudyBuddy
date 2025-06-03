import json, os, requests
from dotenv import load_dotenv

load_dotenv()

def get_id_token(email, password, api_key):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = {"email": email, "password": password, "returnSecureToken": True}
    res = requests.post(url, json=payload)
    res.raise_for_status()
    return res.json()["idToken"]
