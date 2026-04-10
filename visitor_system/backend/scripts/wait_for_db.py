import sys
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import (
    DATABASE_URL,
    DATABASE_WAIT_INTERVAL_SECONDS,
    DATABASE_WAIT_TIMEOUT_SECONDS,
)
from app.db.session import get_engine_kwargs


def main() -> int:
    engine = create_engine(DATABASE_URL, **get_engine_kwargs())
    deadline = time.monotonic() + DATABASE_WAIT_TIMEOUT_SECONDS
    last_error: Exception | None = None

    while time.monotonic() < deadline:
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print("Database connection ready.")
            return 0
        except SQLAlchemyError as exc:
            last_error = exc
            print(f"Waiting for database: {exc}")
            time.sleep(DATABASE_WAIT_INTERVAL_SECONDS)

    print(
        "Database connection timed out after "
        f"{DATABASE_WAIT_TIMEOUT_SECONDS} seconds."
    )
    if last_error is not None:
        print(f"Last database error: {last_error}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
