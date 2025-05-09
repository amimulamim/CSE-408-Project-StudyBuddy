from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    FIREBASE_KEY_PATH: str

    # Add the test-only fields so `.env` doesn't cause validation errors
    FIREBASE_API_KEY: str = ""
    FIREBASE_TEST_EMAIL: str = ""
    FIREBASE_TEST_PASSWORD: str = ""
    E2E_BASE_URL: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")  #  key line for extra vars

settings = Settings()
