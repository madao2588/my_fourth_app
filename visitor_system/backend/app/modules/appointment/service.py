import secrets
import string

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.modules.appointment.appointment import Appointment
from app.modules.appointment.appointment_status import AppointmentStatus
from app.modules.appointment.schemas import AdminAuditRequest, AdminHistoryQuery, ApplyVisitRequest


logger = get_logger()


def _generate_access_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _build_unique_access_code(db: Session) -> str:
    for _ in range(10):
        code = _generate_access_code()
        exists = db.query(Appointment).filter(Appointment.access_code == code).first()
        if not exists:
            return code
    raise HTTPException(status_code=500, detail="无法生成唯一入场码")


def _ensure_pending_for_audit(record: Appointment) -> None:
    if record.status != AppointmentStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail="只有待审批预约可以执行审批操作。",
        )
    if record.approved_at is not None:
        raise HTTPException(
            status_code=400,
            detail="该预约已完成审批，不能重复操作。",
        )
    if record.checked_in_at is not None:
        raise HTTPException(
            status_code=400,
            detail="该预约已签到，不能再次审批。",
        )
    if record.expired_at is not None:
        raise HTTPException(
            status_code=400,
            detail="该预约已过期，不能再次审批。",
        )


def create_appointment(db: Session, payload: ApplyVisitRequest) -> Appointment:
    appointment = Appointment(
        name=payload.name,
        phone=payload.phone,
        region=payload.region,
        reason=payload.reason,
        target_person=payload.target_person,
        appointment_time=payload.appointment_time,
        access_code=_build_unique_access_code(db),
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    logger.info(
        "appointment_created id={} phone={} target={} access_code={}",
        appointment.id,
        appointment.phone,
        appointment.target_person,
        appointment.access_code,
    )
    return appointment


def get_latest_appointment_by_phone(db: Session, phone: str) -> Appointment:
    record = (
        db.query(Appointment)
        .filter(Appointment.phone == phone)
        .order_by(Appointment.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="未找到该手机号的预约记录")
    return record


def get_appointment_by_access_code(db: Session, access_code: str) -> Appointment:
    record = db.query(Appointment).filter(Appointment.access_code == access_code).first()
    if not record:
        raise HTTPException(status_code=404, detail="未找到对应的入场码")
    return record


def list_pending_appointments(db: Session) -> list[Appointment]:
    return (
        db.query(Appointment)
        .filter(Appointment.status == AppointmentStatus.PENDING.value)
        .order_by(Appointment.created_at.desc())
        .all()
    )


def list_admin_appointments(db: Session, filters: AdminHistoryQuery) -> tuple[list[Appointment], int]:
    query = db.query(Appointment)

    if filters.status:
        query = query.filter(Appointment.status == filters.status)
    if filters.phone:
        query = query.filter(Appointment.phone.contains(filters.phone))
    if filters.date_from:
        query = query.filter(Appointment.appointment_time >= filters.date_from)
    if filters.date_to:
        query = query.filter(Appointment.appointment_time <= filters.date_to)

    total = query.count()
    page = max(filters.page, 1)
    page_size = min(max(filters.page_size, 1), 50)
    items = (
        query.order_by(Appointment.appointment_time.desc(), Appointment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def approve_appointment(
    db: Session,
    record_id: int,
    payload: AdminAuditRequest,
    admin_username: str,
) -> Appointment:
    from datetime import UTC, datetime

    record = db.query(Appointment).filter(Appointment.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="未找到对应预约。")
    _ensure_pending_for_audit(record)

    now = datetime.now(UTC)
    record.approved_by = admin_username
    record.approved_at = now
    record.admin_remark = payload.remark

    if payload.action == "approve":
        record.status = AppointmentStatus.APPROVED.value
        record.expired_at = None
    else:
        record.status = AppointmentStatus.REJECTED.value

    db.commit()
    db.refresh(record)
    logger.info(
        "appointment_audited id={} action={} status={} admin={} access_code={} remark={}",
        record.id,
        payload.action,
        record.status,
        admin_username,
        record.access_code,
        payload.remark or "-",
    )
    return record
