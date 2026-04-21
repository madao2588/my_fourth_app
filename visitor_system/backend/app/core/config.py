import os
from datetime import UTC, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_PATH = BASE_DIR / "visitors.db"
DEFAULT_FRONTEND_WEB_DIR = BASE_DIR.parent / "frontend" / "web"


def _get_env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def _get_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value in (None, ""):
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_list_env(name: str) -> list[str]:
    value = os.getenv(name)
    if value in (None, ""):
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def normalize_database_url(value: str) -> str:
    normalized = value.strip()
    if normalized.startswith("postgres://"):
        return normalized.replace("postgres://", "postgresql+psycopg://", 1)
    if normalized.startswith("postgresql://"):
        return normalized.replace("postgresql://", "postgresql+psycopg://", 1)
    return normalized


def _load_timezone(name: str):
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        if name == "Asia/Shanghai":
            return timezone(timedelta(hours=8), name="Asia/Shanghai")
        return UTC


DATABASE_URL = normalize_database_url(
    _get_env("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")
)
DATABASE_BACKEND = "sqlite" if DATABASE_URL.startswith("sqlite") else "postgresql"
FRONTEND_WEB_DIR = Path(_get_env("FRONTEND_WEB_DIR", str(DEFAULT_FRONTEND_WEB_DIR))).expanduser()
JWT_SECRET_KEY = _get_env("JWT_SECRET_KEY", "visitor-system-dev-secret-change-me-32-bytes")
JWT_ALGORITHM = _get_env("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(_get_env("JWT_EXPIRE_MINUTES", "480"))
APP_TIMEZONE_NAME = _get_env("APP_TIMEZONE", "Asia/Shanghai")
APP_TIMEZONE = _load_timezone(APP_TIMEZONE_NAME)
DEFAULT_ADMIN_USERNAME = _get_env("DEFAULT_ADMIN_USERNAME", "madao")
DEFAULT_ADMIN_PASSWORD = _get_env("DEFAULT_ADMIN_PASSWORD", "666666")
APPOINTMENT_EXPIRE_HOURS = int(_get_env("APPOINTMENT_EXPIRE_HOURS", "48"))
AUTO_EXPIRE_ENABLED = _get_bool_env("AUTO_EXPIRE_ENABLED", True)
AUTO_EXPIRE_INTERVAL_MINUTES = int(_get_env("AUTO_EXPIRE_INTERVAL_MINUTES", "60"))
DATABASE_WAIT_TIMEOUT_SECONDS = int(_get_env("DATABASE_WAIT_TIMEOUT_SECONDS", "30"))
DATABASE_WAIT_INTERVAL_SECONDS = float(_get_env("DATABASE_WAIT_INTERVAL_SECONDS", "1"))
LOG_LEVEL = _get_env("LOG_LEVEL", "INFO")
LOG_DIR = Path(_get_env("LOG_DIR", str(BASE_DIR / "logs")))
CORS_ALLOW_ORIGINS = _get_list_env("CORS_ALLOW_ORIGINS")
