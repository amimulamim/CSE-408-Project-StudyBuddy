import os
import requests
from tests.e2e.utils.get_firebase_token import get_id_token
from dotenv import load_dotenv

load_dotenv()
BASE_URL = os.getenv("E2E_BASE_URL")
token = get_id_token(
    os.getenv("FIREBASE_TEST_EMAIL"),
    os.getenv("FIREBASE_TEST_PASSWORD"),
    os.getenv("FIREBASE_API_KEY")
)

def test_login_real_token():
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{BASE_URL}/user/login", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == os.getenv("FIREBASE_TEST_EMAIL")
