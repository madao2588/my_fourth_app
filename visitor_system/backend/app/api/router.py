from fastapi import APIRouter

from app.api.routes import admin, auth, visitor

api_router = APIRouter()
api_router.include_router(visitor.router, tags=["visitor"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
