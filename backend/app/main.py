from fastapi import FastAPI
from app.api.v1.routes import userRoutes
from app.core.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.include_router(userRoutes.router, prefix="/api/v1")
