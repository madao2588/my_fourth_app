from collections import deque
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.config import LOG_DIR
from app.core.time import to_app_naive, today_bounds_in_utc
from app.modules.appointment.appointment import Appointment
from app.modules.appointment.appointment_status import AppointmentStatus


def _parse_log_timestamp(value: str) -> datetime | None:
    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def _normalize_log_filter_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return to_app_naive(value)


def get_recent_logs(
    limit: int = 50,
    level: str | None = None,
    keyword: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> list[dict[str, str]]:
    log_file = Path(LOG_DIR) / "backend.log"
    if not log_file.exists():
        return []

    level_filter = level.upper() if level else None
    keyword_filter = keyword.lower() if keyword else None
    normalized_date_from = _normalize_log_filter_datetime(date_from)
    normalized_date_to = _normalize_log_filter_datetime(date_to)
    recent_lines: deque[str] = deque(maxlen=max(limit, 1) * 5)

    with log_file.open("r", encoding="utf-8") as file:
        for line in file:
            stripped = line.strip()
            if stripped:
                recent_lines.append(stripped)

    entries: list[dict[str, str]] = []
    for line in reversed(recent_lines):
        parts = line.split(" | ", 2)
        if len(parts) != 3:
            continue

        timestamp, item_level, message = parts
        parsed_timestamp = _parse_log_timestamp(timestamp)
        if level_filter and item_level != level_filter:
            continue
        if keyword_filter and keyword_filter not in message.lower() and keyword_filter not in line.lower():
            continue
        if normalized_date_from and parsed_timestamp and parsed_timestamp < normalized_date_from:
            continue
        if normalized_date_to and parsed_timestamp and parsed_timestamp > normalized_date_to:
            continue

        entries.append(
            {
                "timestamp": timestamp,
                "level": item_level,
                "message": message,
                "raw": line,
            }
        )

        if len(entries) >= limit:
            break

    return entries


def get_admin_stats(db: Session) -> dict[str, int]:
    stats = db.query(
        func.count(Appointment.id).label("total"),
        func.sum(case((Appointment.status == AppointmentStatus.PENDING.value, 1), else_=0)).label("pending"),
        func.sum(case((Appointment.status == AppointmentStatus.APPROVED.value, 1), else_=0)).label("approved"),
        func.sum(case((Appointment.status == AppointmentStatus.REJECTED.value, 1), else_=0)).label("rejected"),
        func.sum(case((Appointment.status == AppointmentStatus.EXPIRED.value, 1), else_=0)).label("expired"),
        func.sum(case((Appointment.status == AppointmentStatus.CHECKED_IN.value, 1), else_=0)).label("checked_in"),
    ).one()

    return {
        "total": int(stats.total or 0),
        "pending": int(stats.pending or 0),
        "approved": int(stats.approved or 0),
        "rejected": int(stats.rejected or 0),
        "expired": int(stats.expired or 0),
        "checked_in": int(stats.checked_in or 0),
    }


def _local_today_bounds() -> tuple[datetime, datetime]:
    return today_bounds_in_utc()


def _count_today(db: Session, column, *criteria) -> int:
    start, end = _local_today_bounds()
    query = db.query(func.count(Appointment.id)).filter(column >= start, column < end)
    for criterion in criteria:
        query = query.filter(criterion)
    return int(query.scalar() or 0)


def _get_recent_activity_records(db: Session, limit: int = 8) -> list[Appointment]:
    records_by_id: dict[int, Appointment] = {}
    for column in (
        Appointment.created_at,
        Appointment.approved_at,
        Appointment.checked_in_at,
        Appointment.expired_at,
    ):
        records = (
            db.query(Appointment)
            .filter(column.is_not(None))
            .order_by(column.desc())
            .limit(limit)
            .all()
        )
        for record in records:
            records_by_id[record.id] = record
    return list(records_by_id.values())


def get_admin_overview(db: Session) -> dict:
    activity_records = _get_recent_activity_records(db=db)

    recent_activity: list[dict] = []

    def add_event(
        *,
        event_type: str,
        title: str,
        description: str,
        happened_at: datetime | None,
        record: Appointment,
    ) -> None:
        if happened_at is None:
            return
        recent_activity.append(
            {
                "event_type": event_type,
                "title": title,
                "description": description,
                "happened_at": happened_at,
                "appointment_id": record.id,
                "visitor_name": record.name,
                "phone": record.phone,
                "access_code": record.access_code,
                "status": record.status,
            }
        )

    for record in activity_records:
        add_event(
            event_type="created",
            title="新预约提交",
            description=f"{record.name} 提交了到访申请，受访人：{record.target_person}",
            happened_at=record.created_at,
            record=record,
        )
        if record.approved_at is not None:
            event_type = (
                AppointmentStatus.REJECTED.value
                if record.status == AppointmentStatus.REJECTED.value
                else AppointmentStatus.APPROVED.value
            )
            title = "预约已拒绝" if event_type == AppointmentStatus.REJECTED.value else "预约已审批通过"
            description = (
                f"{record.name} 的预约被拒绝"
                if event_type == AppointmentStatus.REJECTED.value
                else f"{record.name} 的预约已通过审批"
            )
            add_event(
                event_type=event_type,
                title=title,
                description=description,
                happened_at=record.approved_at,
                record=record,
            )
        add_event(
            event_type="checked_in",
            title="访客已签到",
            description=f"{record.name} 已完成现场签到",
            happened_at=record.checked_in_at,
            record=record,
        )
        add_event(
            event_type="expired",
            title="预约已过期",
            description=f"{record.name} 的预约已被标记为过期",
            happened_at=record.expired_at,
            record=record,
        )

    recent_activity.sort(key=lambda item: item["happened_at"], reverse=True)

    return {
        "today": {
            "created": _count_today(db, Appointment.created_at),
            "pending": _count_today(
                db,
                Appointment.created_at,
                Appointment.status == AppointmentStatus.PENDING.value,
            ),
            "approved": _count_today(
                db,
                Appointment.approved_at,
                Appointment.status != AppointmentStatus.REJECTED.value,
            ),
            "rejected": _count_today(
                db,
                Appointment.approved_at,
                Appointment.status == AppointmentStatus.REJECTED.value,
            ),
            "checked_in": _count_today(db, Appointment.checked_in_at),
            "expired": _count_today(db, Appointment.expired_at),
        },
        "recent_activity": recent_activity[:8],
    }
