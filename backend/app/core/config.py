from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    DATABASE_URL: str
    FIREBASE_KEY_PATH: str
    FIREBASE_STORAGE_BUCKET: str
    BACKEND_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: str = "*"
    GEMINI_API_KEY: str
    QDRANT_HOST: str
    QDRANT_API_KEY: str
    QDRANT_COLLECTION_NAME: str
    QUERY_EMBEDDING_MODEL: str = "models/embedding-001"

    # Test-only fields
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