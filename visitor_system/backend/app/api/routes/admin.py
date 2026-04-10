from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import APPOINTMENT_EXPIRE_HOURS
from app.db.session import get_db
from app.models.user import User
from app.schemas.appointment import (
    AdminAuditRequest,
    AdminCheckInRequest,
    AdminExpireStaleResponse,
    AdminExpireRequest,
    AdminHistoryQuery,
    AdminInspectRequest,
    AdminLogEntry,
    AdminOverviewResponse,
    AdminStatsResponse,
    PaginatedAppointmentsResponse,
    AppointmentRead,
)
from app.services.appointment_service import (
    approve_appointment,
    check_in_appointment,
    expire_stale_appointments,
    expire_appointment,
    get_admin_overview,
    get_admin_stats,
    get_appointment_by_access_code,
    list_admin_appointments,
    list_pending_appointments,
)
from app.services.log_service import get_recent_logs

router = APIRouter()


@router.get("/pending", response_model=list[AppointmentRead])
def get_pending_list(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[AppointmentRead]:
    records = list_pending_appointments(db=db)
    return [AppointmentRead.model_validate(record) for record in records]


@router.get("/stats", response_model=AdminStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> AdminStatsResponse:
    return AdminStatsResponse(**get_admin_stats(db=db))


@router.get("/overview", response_model=AdminOverviewResponse)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> AdminOverviewResponse:
    return AdminOverviewResponse(**get_admin_overview(db=db))


@router.get("/logs", response_model=list[AdminLogEntry])
def get_admin_logs(
    limit: int = Query(default=30, ge=1, le=200),
    level: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    _: User = Depends(get_current_admin),
) -> list[AdminLogEntry]:
    return [
        AdminLogEntry(**item)
        for item in get_recent_logs(
            limit=limit,
            level=level,
            keyword=keyword,
            date_from=date_from,
            date_to=date_to,
        )
    ]


@router.get("/list", response_model=PaginatedAppointmentsResponse)
def get_admin_list(
    status: str | None = Query(default=None),
    phone: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> PaginatedAppointmentsResponse:
    filters = AdminHistoryQuery(
        status=status,
        phone=phone,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    records, total = list_admin_appointments(db=db, filters=filters)
    return PaginatedAppointmentsResponse(
        items=[AppointmentRead.model_validate(record) for record in records],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.put("/approve/{record_id}", response_model=AppointmentRead)
def approve_visit(
    record_id: int,
    payload: AdminAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> AppointmentRead:
    record = approve_appointment(
        db=db,
        record_id=record_id,
        payload=payload,
        admin_username=current_user.username,
    )
    return AppointmentRead.model_validate(record)


@router.post("/check-in", response_model=AppointmentRead)
def check_in_visit(
    payload: AdminCheckInRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> AppointmentRead:
    record = check_in_appointment(db=db, access_code=payload.access_code)
    return AppointmentRead.model_validate(record)


@router.post("/inspect", response_model=AppointmentRead)
def inspect_visit(
    payload: AdminInspectRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> AppointmentRead:
    record = get_appointment_by_access_code(db=db, access_code=payload.access_code)
    return AppointmentRead.model_validate(record)


@router.post("/expire", response_model=AppointmentRead)
def expire_visit(
    payload: AdminExpireRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> AppointmentRead:
    record = expire_appointment(db=db, access_code=payload.access_code)
    return AppointmentRead.model_validate(record)


@router.post("/expire-stale", response_model=AdminExpireStaleResponse)
def expire_stale_visits(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> AdminExpireStaleResponse:
    expired_count = expire_stale_appointments(db=db)
    return AdminExpireStaleResponse(
        expired_count=expired_count,
        threshold_hours=APPOINTMENT_EXPIRE_HOURS,
    )
