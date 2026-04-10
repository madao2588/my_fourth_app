from collections.abc import Generator

from sqlalchemy import text
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import OperationalError

from app.core.config import DATABASE_URL


def get_engine_kwargs() -> dict:
    if DATABASE_URL.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {}


engine = create_engine(DATABASE_URL, **get_engine_kwargs())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.services.auth_service import seed_default_admin

    db = SessionLocal()
    try:
        seed_default_admin(db)
    except OperationalError as exc:
        raise RuntimeError(
            "数据库尚未完成迁移，请先执行 `alembic upgrade head` 后再启动应用。"
        ) from exc
    finally:
        db.close()


def check_database_connection() -> bool:
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return True
    finally:
        db.close()
