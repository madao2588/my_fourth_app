from enum import Enum


class AppointmentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    CHECKED_IN = "checked_in"
    REJECTED = "rejected"
    EXPIRED = "expired"
