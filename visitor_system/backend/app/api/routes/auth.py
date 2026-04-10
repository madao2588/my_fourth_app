from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AdminUserCreateRequest,
    AdminUserRead,
    AdminUserStatusUpdateRequest,
    ChangePasswordRequest,
    ChangePasswordResponse,
    CurrentUserRead,
    LoginRequest,
    LoginResponse,
)
from app.services.auth_service import (
    authenticate_user,
    change_user_password,
    create_user,
    create_access_token,
    list_users,
    update_user_active_status,
)

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = authenticate_user(db=db, username=payload.username, password=payload.password)
    token, expires_in = create_access_token(user)
    return LoginResponse(
        access_token=token,
        expires_in=expires_in,
        username=user.username,
        force_password_change=user.force_password_change,
    )


@router.get("/me", response_model=CurrentUserRead)
def get_current_account(current_user: User = Depends(get_current_user)) -> CurrentUserRead:
    return CurrentUserRead(
        id=current_user.id,
        username=current_user.username,
        is_active=current_user.is_active,
        force_password_change=current_user.force_password_change,
        created_at=current_user.created_at,
    )


@router.post("/change-password", response_model=ChangePasswordResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChangePasswordResponse:
    change_user_password(
        db=db,
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return ChangePasswordResponse(message="Password updated successfully.")


@router.get("/users", response_model=list[AdminUserRead])
def get_admin_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[AdminUserRead]:
    return [AdminUserRead.model_validate(user) for user in list_users(db)]


@router.post("/users", response_model=AdminUserRead, status_code=201)
def create_admin_user(
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> AdminUserRead:
    user = create_user(
        db=db,
        actor=current_user,
        username=payload.username,
        password=payload.password,
        is_active=payload.is_active,
        force_password_change=payload.force_password_change,
    )
    return AdminUserRead.model_validate(user)


@router.patch("/users/{user_id}/status", response_model=AdminUserRead)
def update_admin_user_status(
    user_id: int,
    payload: AdminUserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> AdminUserRead:
    user = update_user_active_status(
        db=db,
        actor=current_user,
        target_user_id=user_id,
        is_active=payload.is_active,
    )
    return AdminUserRead.model_validate(user)
