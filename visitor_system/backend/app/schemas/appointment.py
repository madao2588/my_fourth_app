from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApplyVisitRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=6, max_length=20)
    reason: str = Field(..., min_length=1, max_length=255)
    target_person: str = Field(..., min_length=1, max_length=50)
    appointment_time: datetime

    @field_validator("appointment_time")
    @classmethod
    def normalize_appointment_time(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class ApplyVisitResponse(BaseModel):
    status: str
    application_id: int
    access_code: str


class QueryAppointmentResponse(BaseModel):
    found: bool
    record: "AppointmentRead"


class AdminAuditRequest(BaseModel):
    action: Literal["approve", "reject"]
    remark: str = Field(default="", max_length=255)


class AdminCheckInRequest(BaseModel):
    access_code: str = Field(..., min_length=6, max_length=6)


class AdminExpireRequest(BaseModel):
    access_code: str = Field(..., min_length=6, max_length=6)


class AdminInspectRequest(BaseModel):
    access_code: str = Field(..., min_length=6, max_length=6)


class AdminExpireStaleResponse(BaseModel):
    expired_count: int
    threshold_hours: int


class AdminLogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    raw: str


class AdminHistoryQuery(BaseModel):
    status: str | None = None
    phone: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = 1
    page_size: int = 10


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


class AdminOverviewResponse(BaseModel):
    today: AdminTodayStatsResponse
    recent_activity: list[AdminActivityItem]


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    reason: str
    target_person: str
    appointment_time: datetime
    status: str
    admin_remark: str
    approved_by: str | None = None
    approved_at: datetime | None = None
    checked_in_at: datetime | None = None
    expired_at: datetime | None = None
    access_code: str
    created_at: datetime


class PaginatedAppointmentsResponse(BaseModel):
    items: list[AppointmentRead]
    total: int
    page: int
    page_size: int
