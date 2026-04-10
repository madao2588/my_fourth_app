import random
import string
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.config import APPOINTMENT_EXPIRE_HOURS
from app.core.logging import get_logger
from app.models.appointment import Appointment
from app.schemas.appointment import AdminAuditRequest, AdminHistoryQuery, ApplyVisitRequest

logger = get_logger()


def _generate_access_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _build_unique_access_code(db: Session) -> str:
    for _ in range(10):
        code = _generate_access_code()
        exists = db.query(Appointment).filter(Appointment.access_code == code).first()
        if not exists:
            return code
    raise HTTPException(status_code=500, detail="无法生成唯一入场码")



def _ensure_pending_for_audit(record: Appointment) -> None:
    if record.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending appointments can be audited.",
        )
    if record.approved_at is not None:
        raise HTTPException(
            status_code=400,
            detail="This appointment has already been audited.",
        )
    if record.checked_in_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Checked-in appointments cannot be audited again.",
        )
    if record.expired_at is not None:
        raise HTTPException(
            status_code=400,
            detail="Expired appointments cannot be audited again.",
        )

def create_appointment(db: Session, payload: ApplyVisitRequest) -> Appointment:
    appointment = Appointment(
        name=payload.name,
        phone=payload.phone,
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
        .filter(Appointment.status == "pending")
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


def get_admin_stats(db: Session) -> dict[str, int]:
    stats = db.query(
        func.count(Appointment.id).label("total"),
        func.sum(case((Appointment.status == "pending", 1), else_=0)).label("pending"),
        func.sum(case((Appointment.status == "approved", 1), else_=0)).label("approved"),
        func.sum(case((Appointment.status == "rejected", 1), else_=0)).label("rejected"),
        func.sum(case((Appointment.status == "expired", 1), else_=0)).label("expired"),
        func.sum(case((Appointment.checked_in_at.is_not(None), 1), else_=0)).label("checked_in"),
    ).one()

    return {
        "total": int(stats.total or 0),
        "pending": int(stats.pending or 0),
        "approved": int(stats.approved or 0),
        "rejected": int(stats.rejected or 0),
        "expired": int(stats.expired or 0),
        "checked_in": int(stats.checked_in or 0),
    }


def _to_local_date(value: datetime | None) -> datetime.date | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone().date()


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def get_admin_overview(db: Session) -> dict:
    appointments = db.query(Appointment).all()
    today = datetime.now().astimezone().date()

    recent_activity: list[dict] = []

    def add_event(
        *,
        event_type: str,
        title: str,
        description: str,
        happened_at: datetime | None,
        record: Appointment,
    ) -> None:
        if happened_at is None:
            return
        recent_activity.append(
            {
                "event_type": event_type,
                "title": title,
                "description": description,
                "happened_at": happened_at,
                "appointment_id": record.id,
                "visitor_name": record.name,
                "phone": record.phone,
                "access_code": record.access_code,
                "status": record.status,
            }
        )

    for record in appointments:
        add_event(
            event_type="created",
            title="新预约提交",
            description=f"{record.name} 提交了到访申请，受访人：{record.target_person}",
            happened_at=record.created_at,
            record=record,
        )
        if record.approved_at is not None:
            event_type = "rejected" if record.status == "rejected" else "approved"
            title = "预约已拒绝" if event_type == "rejected" else "预约已审批通过"
            description = (
                f"{record.name} 的预约被拒绝"
                if event_type == "rejected"
                else f"{record.name} 的预约已通过审批"
            )
            add_event(
                event_type=event_type,
                title=title,
                description=description,
                happened_at=record.approved_at,
                record=record,
            )
        add_event(
            event_type="checked_in",
            title="访客已签到",
            description=f"{record.name} 已完成现场签到",
            happened_at=record.checked_in_at,
            record=record,
        )
        add_event(
            event_type="expired",
            title="预约已过期",
            description=f"{record.name} 的预约已被标记为过期",
            happened_at=record.expired_at,
            record=record,
        )

    recent_activity.sort(key=lambda item: item["happened_at"], reverse=True)

    return {
        "today": {
            "created": sum(1 for item in appointments if _to_local_date(item.created_at) == today),
            "pending": sum(
                1
                for item in appointments
                if item.status == "pending" and _to_local_date(item.created_at) == today
            ),
            "approved": sum(
                1
                for item in appointments
                if item.status != "rejected" and _to_local_date(item.approved_at) == today
            ),
            "rejected": sum(
                1
                for item in appointments
                if item.status == "rejected" and _to_local_date(item.approved_at) == today
            ),
            "checked_in": sum(1 for item in appointments if _to_local_date(item.checked_in_at) == today),
            "expired": sum(1 for item in appointments if _to_local_date(item.expired_at) == today),
        },
        "recent_activity": recent_activity[:8],
    }


def expire_stale_appointments(db: Session, threshold_hours: int | None = None) -> int:
    hours = threshold_hours or APPOINTMENT_EXPIRE_HOURS
    now = datetime.now(UTC)
    expired_count = 0

    records = (
        db.query(Appointment)
        .filter(Appointment.status == "approved")
        .filter(Appointment.checked_in_at.is_(None))
        .filter(Appointment.expired_at.is_(None))
        .all()
    )

    for record in records:
        appointment_at = _normalize_datetime(record.appointment_time)
        if appointment_at is None:
            continue

        age_hours = (now - appointment_at).total_seconds() / 3600
        if age_hours < hours:
            continue

        record.status = "expired"
        record.expired_at = now
        expired_count += 1
        logger.info(
            "appointment_expired_automatic id={} phone={} access_code={} threshold_hours={}",
            record.id,
            record.phone,
            record.access_code,
            hours,
        )

    if expired_count:
        db.commit()

    return expired_count


def approve_appointment(
    db: Session,
    record_id: int,
    payload: AdminAuditRequest,
    admin_username: str,
) -> Appointment:
    record = db.query(Appointment).filter(Appointment.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="?????")
    _ensure_pending_for_audit(record)

    now = datetime.now(UTC)
    record.approved_by = admin_username
    record.approved_at = now
    record.admin_remark = payload.remark

    if payload.action == "approve":
        record.status = "approved"
        record.expired_at = None
    else:
        record.status = "rejected"

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


def check_in_appointment(db: Session, access_code: str) -> Appointment:
    record = get_appointment_by_access_code(db=db, access_code=access_code)

    if record.status != "approved":
        raise HTTPException(status_code=400, detail="当前预约未通过审批，无法签到")
    if record.expired_at is not None:
        raise HTTPException(status_code=400, detail="当前预约已过期，无法签到")
    if record.checked_in_at is not None:
        raise HTTPException(status_code=400, detail="当前预约已完成签到")

    record.checked_in_at = datetime.now(UTC)
    db.commit()
    db.refresh(record)
    logger.info(
        "appointment_checked_in id={} phone={} access_code={} checked_in_at={}",
        record.id,
        record.phone,
        record.access_code,
        record.checked_in_at.isoformat() if record.checked_in_at else "-",
    )
    return record


def expire_appointment(db: Session, access_code: str) -> Appointment:
    record = get_appointment_by_access_code(db=db, access_code=access_code)

    if record.status != "approved":
        raise HTTPException(status_code=400, detail="当前预约不是已通过状态，无法设为过期")
    if record.checked_in_at is not None:
        raise HTTPException(status_code=400, detail="当前预约已签到，不能再设为过期")
    if record.expired_at is not None:
        raise HTTPException(status_code=400, detail="当前预约已过期")

    record.status = "expired"
    record.expired_at = datetime.now(UTC)
    db.commit()
    db.refresh(record)
    logger.info(
        "appointment_expired_manual id={} phone={} access_code={} expired_at={}",
        record.id,
        record.phone,
        record.access_code,
        record.expired_at.isoformat() if record.expired_at else "-",
    )
    return record
