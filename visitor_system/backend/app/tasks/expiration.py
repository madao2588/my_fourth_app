import asyncio

from app.core.config import AUTO_EXPIRE_INTERVAL_MINUTES
from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.services.appointment_service import expire_stale_appointments


logger = get_logger()


async def run_expiration_worker(stop_event: asyncio.Event) -> None:
    interval_seconds = max(AUTO_EXPIRE_INTERVAL_MINUTES, 1) * 60
    logger.info(
        "Automatic appointment expiration worker started, interval=%s minutes.",
        max(AUTO_EXPIRE_INTERVAL_MINUTES, 1),
    )

    while not stop_event.is_set():
        db = SessionLocal()
        try:
            expired_count = expire_stale_appointments(db=db)
            if expired_count:
                logger.info(
                    "Automatic expiration completed, expired_count=%s.",
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
