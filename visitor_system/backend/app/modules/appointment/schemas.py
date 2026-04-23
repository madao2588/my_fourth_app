from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.time import ensure_utc, to_utc


class ApplyVisitRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=6, max_length=20)
    region: str = Field(..., min_length=1, max_length=50)
    reason: str = Field(..., min_length=1, max_length=255)
    target_person: str = Field(..., min_length=1, max_length=50)
    appointment_time: datetime

    @field_validator("appointment_time")
    @classmethod
    def normalize_appointment_time(cls, value: datetime) -> datetime:
        return to_utc(value)


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


class AdminHistoryQuery(BaseModel):
    status: str | None = None
    phone: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = 1
    page_size: int = 10

    @field_validator("date_from", "date_to")
    @classmethod
    def normalize_history_range(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return to_utc(value)


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    region: str
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

    @field_validator(
        "appointment_time",
        "approved_at",
        "checked_in_at",
        "expired_at",
        "created_at",
        mode="before",
    )
    @classmethod
    def normalize_output_datetime(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return ensure_utc(value)


class PaginatedAppointmentsResponse(BaseModel):
    items: list[AppointmentRead]
    total: int
    page: int
    page_size: int
