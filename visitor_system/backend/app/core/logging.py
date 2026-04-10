import sys
from pathlib import Path

from loguru import logger

from app.core.config import LOG_DIR, LOG_LEVEL


def setup_logging() -> None:
    log_dir = Path(LOG_DIR)
    log_dir.mkdir(parents=True, exist_ok=True)

    logger.remove()
    logger.add(
        sys.stdout,
        level=LOG_LEVEL,
        enqueue=False,
        backtrace=False,
        diagnose=False,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    )
    logger.add(
        log_dir / "backend.log",
        level=LOG_LEVEL,
        rotation="10 MB",
        retention="14 days",
        encoding="utf-8",
        enqueue=False,
        backtrace=False,
        diagnose=False,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    )


def get_logger():
    return logger
