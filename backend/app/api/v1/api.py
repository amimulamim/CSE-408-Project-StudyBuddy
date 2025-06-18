from fastapi import APIRouter
from app.api.v1.routes import user,auth,chat,quiz,billing,admin


api_router = APIRouter()



# Include all API v1 routes
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(user.router, prefix="/user", tags=["User"])
api_router.include_router(chat.router, prefix="/ai/chat", tags=["Chat"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["Quiz"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
