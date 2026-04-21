from datetime import UTC, datetime, timedelta

from app.core.config import APP_TIMEZONE


def to_app_timezone(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=APP_TIMEZONE)
    return value.astimezone(APP_TIMEZONE)


def to_utc(value: datetime) -> datetime:
    return to_app_timezone(value).astimezone(UTC)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def to_app_naive(value: datetime) -> datetime:
    return to_app_timezone(value).replace(tzinfo=None)


def today_bounds_in_utc() -> tuple[datetime, datetime]:
    start = datetime.now(APP_TIMEZONE).replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.astimezone(UTC), end.astimezone(UTC)
