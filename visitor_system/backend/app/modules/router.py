from fastapi import APIRouter

from app.modules.appointment.api import admin_router as appointment_admin_router
from app.modules.appointment.api import router as appointment_router
from app.modules.audit.api import admin_router as audit_admin_router
from app.modules.identity.api import router as identity_router
from app.modules.onsite.api import admin_router as onsite_admin_router
from app.modules.scheduler.api import admin_router as scheduler_admin_router


api_router = APIRouter()
api_router.include_router(appointment_router, tags=["visitor"])
api_router.include_router(identity_router, tags=["auth"])
api_router.include_router(appointment_admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(onsite_admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(audit_admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(scheduler_admin_router, prefix="/admin", tags=["admin"])
