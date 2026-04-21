import asyncio
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.time import ensure_utc
from app.core.config import APPOINTMENT_EXPIRE_HOURS, AUTO_EXPIRE_INTERVAL_MINUTES
from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.modules.appointment.appointment import Appointment
from app.modules.appointment.appointment_status import AppointmentStatus


logger = get_logger()


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return ensure_utc(value)


def expire_stale_appointments(db: Session, threshold_hours: int | None = None) -> int:
    hours = threshold_hours or APPOINTMENT_EXPIRE_HOURS
    now = datetime.now(UTC)
    expired_count = 0

    records = (
        db.query(Appointment)
        .filter(Appointment.status == AppointmentStatus.APPROVED.value)
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

        record.status = AppointmentStatus.EXPIRED.value
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


async def run_expiration_worker(stop_event: asyncio.Event) -> None:
    interval_seconds = max(AUTO_EXPIRE_INTERVAL_MINUTES, 1) * 60
    logger.info(
        "Automatic appointment expiration worker started, interval={} minutes.",
        max(AUTO_EXPIRE_INTERVAL_MINUTES, 1),
    )

    while not stop_event.is_set():
        db = SessionLocal()
        try:
            expired_count = expire_stale_appointments(db=db)
            if expired_count:
                logger.info(
                    "Automatic expiration completed, expired_count={}.",
                    expired_count,
                )
        except Exception:
            logger.exception("Automatic expiration worker failed.")
        finally:
            db.close()

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval_seconds)
        except TimeoutError:
            continue

    logger.info("Automatic appointment expiration worker stopped.")
