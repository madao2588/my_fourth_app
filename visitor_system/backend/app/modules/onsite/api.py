from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.appointment.schemas import AppointmentRead
from app.modules.identity.deps import require_permission
from app.modules.identity.permissions import Permission
from app.modules.identity.user import User
from app.modules.onsite.schemas import AdminCheckInRequest, AdminExpireRequest, AdminInspectRequest
from app.modules.onsite.service import check_in_appointment, expire_appointment, inspect_appointment


admin_router = APIRouter()


@admin_router.post("/check-in", response_model=AppointmentRead)
def check_in_visit(
    payload: AdminCheckInRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.APPOINTMENT_CHECK_IN)),
) -> AppointmentRead:
    record = check_in_appointment(db=db, access_code=payload.access_code)
    return AppointmentRead.model_validate(record)


@admin_router.post("/inspect", response_model=AppointmentRead)
def inspect_visit(
    payload: AdminInspectRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.APPOINTMENT_INSPECT)),
) -> AppointmentRead:
    record = inspect_appointment(db=db, access_code=payload.access_code)
    return AppointmentRead.model_validate(record)


@admin_router.post("/expire", response_model=AppointmentRead)
def expire_visit(
    payload: AdminExpireRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.APPOINTMENT_EXPIRE)),
) -> AppointmentRead:
    record = expire_appointment(db=db, access_code=payload.access_code)
    return AppointmentRead.model_validate(record)
