from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    DATABASE_URL: str
    FIREBASE_KEY_PATH: str
    FIREBASE_STORAGE_BUCKET: str
    BACKEND_URL: str = "http://localhost:8000"  # Default for development
    ALLOWED_ORIGINS: str = "*"  # default for local/dev

    # Add the test-only fields so `.env` doesn't cause validation errors
    FIREBASE_API_KEY: str = ""
    FIREBASE_TEST_EMAIL: str = ""
    FIREBASE_TEST_PASSWORD: str = ""
    E2E_BASE_URL: str = ""

    SSLCOMMERZ_STORE_ID: str
    SSLCOMMERZ_STORE_PASSWORD: str
    SSLCOMMERZ_SANDBOX: bool = True

    model_config = SettingsConfigDict(
        env_file=os.getenv("ENV_FILE", ".env"), 
        extra="ignore"
    )

settings = Settings()
