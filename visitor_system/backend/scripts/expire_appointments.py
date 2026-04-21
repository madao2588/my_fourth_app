from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import APPOINTMENT_EXPIRE_HOURS
from app.core.logging import get_logger, setup_logging
from app.db.session import SessionLocal
from app.modules.scheduler.service import expire_stale_appointments

setup_logging()
logger = get_logger()


def main() -> None:
    db = SessionLocal()
    try:
        expired_count = expire_stale_appointments(db=db)
        logger.info(
            "expire_script_completed expired_count={} threshold_hours={}",
            expired_count,
            APPOINTMENT_EXPIRE_HOURS,
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
