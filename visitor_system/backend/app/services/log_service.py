from collections import deque
from datetime import datetime
from pathlib import Path

from app.core.config import LOG_DIR


def _parse_log_timestamp(value: str) -> datetime | None:
    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


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
        if date_from and parsed_timestamp and parsed_timestamp < date_from:
            continue
        if date_to and parsed_timestamp and parsed_timestamp > date_to:
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
