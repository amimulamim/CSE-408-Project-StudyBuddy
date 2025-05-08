from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    FIREBASE_KEY_PATH: str

    class Config:
        env_file = ".env"

settings = Settings()
