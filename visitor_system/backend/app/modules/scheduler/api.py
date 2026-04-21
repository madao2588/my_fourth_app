from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import APPOINTMENT_EXPIRE_HOURS
from app.db.session import get_db
from app.modules.identity.deps import require_permission
from app.modules.identity.permissions import Permission
from app.modules.identity.user import User
from app.modules.scheduler.schemas import AdminExpireStaleResponse
from app.modules.scheduler.service import expire_stale_appointments


admin_router = APIRouter()


@admin_router.post("/expire-stale", response_model=AdminExpireStaleResponse)
def expire_stale_visits(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.APPOINTMENT_EXPIRE_STALE)),
) -> AdminExpireStaleResponse:
    expired_count = expire_stale_appointments(db=db)
    return AdminExpireStaleResponse(
        expired_count=expired_count,
        threshold_hours=APPOINTMENT_EXPIRE_HOURS,
    )
