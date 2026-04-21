import io
from datetime import datetime

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from qrcode.image.svg import SvgPathImage
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.appointment.schemas import (
    AdminAuditRequest,
    AdminHistoryQuery,
    AppointmentRead,
    ApplyVisitRequest,
    ApplyVisitResponse,
    PaginatedAppointmentsResponse,
    QueryAppointmentResponse,
)
from app.modules.appointment.service import (
    approve_appointment,
    create_appointment,
    get_latest_appointment_by_phone,
    list_admin_appointments,
    list_pending_appointments,
)
from app.modules.identity.deps import require_permission
from app.modules.identity.permissions import Permission
from app.modules.identity.user import User


router = APIRouter()
admin_router = APIRouter()


def _normalize_qr_access_code(access_code: str) -> str:
    normalized = access_code.strip().upper()
    if len(normalized) != 6 or not normalized.isalnum():
        raise HTTPException(status_code=400, detail="入场码格式无效。")
    return normalized


@router.post("/apply", response_model=ApplyVisitResponse, status_code=status.HTTP_201_CREATED)
def apply_visit(payload: ApplyVisitRequest, db: Session = Depends(get_db)) -> ApplyVisitResponse:
    appointment = create_appointment(db=db, payload=payload)
    return ApplyVisitResponse(
        status="success",
        application_id=appointment.id,
        access_code=appointment.access_code,
    )


@router.get("/query/{phone}", response_model=QueryAppointmentResponse)
def query_visit(phone: str, db: Session = Depends(get_db)) -> QueryAppointmentResponse:
    record = get_latest_appointment_by_phone(db=db, phone=phone)
    return QueryAppointmentResponse(found=True, record=AppointmentRead.model_validate(record))


@router.get("/pass-qr/{access_code}", response_class=Response)
def get_pass_qr(access_code: str) -> Response:
    normalized_access_code = _normalize_qr_access_code(access_code)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(normalized_access_code)
    qr.make(fit=True)

    image = qr.make_image(image_factory=SvgPathImage)
    stream = io.BytesIO()
    image.save(stream)

    return Response(
        content=stream.getvalue(),
        media_type="image/svg+xml",
        headers={"Cache-Control": "no-store"},
    )


@admin_router.get("/pending", response_model=list[AppointmentRead])
def get_pending_list(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.APPOINTMENT_READ_PENDING)),
) -> list[AppointmentRead]:
    records = list_pending_appointments(db=db)
    return [AppointmentRead.model_validate(record) for record in records]


@admin_router.get("/list", response_model=PaginatedAppointmentsResponse)
def get_admin_list(
    status: str | None = Query(default=None),
    phone: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.APPOINTMENT_HISTORY)),
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


@admin_router.put("/approve/{record_id}", response_model=AppointmentRead)
def approve_visit(
    record_id: int,
    payload: AdminAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.APPOINTMENT_AUDIT)),
) -> AppointmentRead:
    record = approve_appointment(
        db=db,
        record_id=record_id,
        payload=payload,
        admin_username=current_user.username,
    )
    return AppointmentRead.model_validate(record)
