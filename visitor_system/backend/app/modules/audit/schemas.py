from datetime import datetime

from pydantic import BaseModel, field_validator

from app.core.time import ensure_utc


class AdminLogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    raw: str


class AdminStatsResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    expired: int
    checked_in: int


class AdminTodayStatsResponse(BaseModel):
    created: int
    pending: int
    approved: int
    rejected: int
    checked_in: int
    expired: int


class AdminActivityItem(BaseModel):
    event_type: str
    title: str
    description: str
    happened_at: datetime
    appointment_id: int
    visitor_name: str
    phone: str
    access_code: str
    status: str

    @field_validator("happened_at", mode="before")
    @classmethod
    def normalize_happened_at(cls, value: datetime) -> datetime:
        return ensure_utc(value)


class AdminOverviewResponse(BaseModel):
    today: AdminTodayStatsResponse
    recent_activity: list[AdminActivityItem]
