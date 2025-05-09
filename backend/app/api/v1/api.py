from fastapi import APIRouter
from app.api.v1.routes import user  # Add more modules as needed

api_router = APIRouter()
api_router.include_router(user.router, prefix="/user", tags=["User"])
