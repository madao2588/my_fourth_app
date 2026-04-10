import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_PATH = BASE_DIR / "visitors.db"
FRONTEND_WEB_DIR = BASE_DIR.parent / "frontend" / "web"


def _get_env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value not in (None, "") else default


def _get_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value in (None, ""):
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def normalize_database_url(value: str) -> str:
    normalized = value.strip()
    if normalized.startswith("postgres://"):
        return normalized.replace("postgres://", "postgresql+psycopg://", 1)
    if normalized.startswith("postgresql://"):
        return normalized.replace("postgresql://", "postgresql+psycopg://", 1)
    return normalized


DATABASE_URL = normalize_database_url(
    _get_env("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")
)
DATABASE_BACKEND = "sqlite" if DATABASE_URL.startswith("sqlite") else "postgresql"
JWT_SECRET_KEY = _get_env("JWT_SECRET_KEY", "visitor-system-dev-secret")
JWT_ALGORITHM = _get_env("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(_get_env("JWT_EXPIRE_MINUTES", "480"))
DEFAULT_ADMIN_USERNAME = _get_env("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = _get_env("DEFAULT_ADMIN_PASSWORD", "admin123456")
APPOINTMENT_EXPIRE_HOURS = int(_get_env("APPOINTMENT_EXPIRE_HOURS", "48"))
AUTO_EXPIRE_ENABLED = _get_bool_env("AUTO_EXPIRE_ENABLED", True)
AUTO_EXPIRE_INTERVAL_MINUTES = int(_get_env("AUTO_EXPIRE_INTERVAL_MINUTES", "60"))
DATABASE_WAIT_TIMEOUT_SECONDS = int(_get_env("DATABASE_WAIT_TIMEOUT_SECONDS", "30"))
DATABASE_WAIT_INTERVAL_SECONDS = float(_get_env("DATABASE_WAIT_INTERVAL_SECONDS", "1"))
LOG_LEVEL = _get_env("LOG_LEVEL", "INFO")
LOG_DIR = Path(_get_env("LOG_DIR", str(BASE_DIR / "logs")))
