from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.modules.appointment.appointment import Appointment
from app.modules.appointment.appointment_status import AppointmentStatus
from app.modules.appointment.service import get_appointment_by_access_code


logger = get_logger()


def inspect_appointment(db: Session, access_code: str) -> Appointment:
    return get_appointment_by_access_code(db=db, access_code=access_code)


def check_in_appointment(db: Session, access_code: str) -> Appointment:
    record = get_appointment_by_access_code(db=db, access_code=access_code)

    if record.checked_in_at is not None:
        raise HTTPException(status_code=400, detail="当前预约已完成签到")
    if record.expired_at is not None:
        raise HTTPException(status_code=400, detail="当前预约已过期，无法签到")
    if record.status != AppointmentStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="当前预约未通过审批，无法签到")

    record.status = AppointmentStatus.CHECKED_IN.value
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

    if record.checked_in_at is not None:
        raise HTTPException(status_code=400, detail="当前预约已签到，不能再设置为过期")
    if record.expired_at is not None:
        raise HTTPException(status_code=400, detail="当前预约已过期")
    if record.status != AppointmentStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="当前预约不是已通过状态，无法设置为过期")

    record.status = AppointmentStatus.EXPIRED.value
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
