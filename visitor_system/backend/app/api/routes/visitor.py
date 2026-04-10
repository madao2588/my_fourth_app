from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.appointment import ApplyVisitRequest, ApplyVisitResponse, AppointmentRead, QueryAppointmentResponse
from app.services.appointment_service import create_appointment, get_latest_appointment_by_phone

router = APIRouter()


@router.post("/apply", response_model=ApplyVisitResponse, status_code=status.HTTP_201_CREATED)
def apply_visit(payload: ApplyVisitRequest, db: Session = Depends(get_db)) -> ApplyVisitResponse:
    appointment = create_appointment(db=db, payload=payload)
    return ApplyVisitResponse(
        status="success",
        application_id=appointment.id,
        access_code=appointment.access_code,
    )


@router.get("/query/{phone}", response_model=QueryAppointmentResponse)
def query_visit(phone: str, db: Session = Depends(get_db)) -> QueryAppointmentResponse:
    record = get_latest_appointment_by_phone(db=db, phone=phone)
    return QueryAppointmentResponse(found=True, record=AppointmentRead.model_validate(record))
