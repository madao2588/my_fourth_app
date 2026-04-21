from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.deps import get_current_user, require_permission
from app.modules.identity.permissions import Permission
from app.modules.identity.schemas import (
    AdminUserCreateRequest,
    AdminUserRead,
    AdminUserStatusUpdateRequest,
    AdminUserUpdateRequest,
    ChangePasswordRequest,
    ChangePasswordResponse,
    CurrentUserRead,
    DeleteAdminUserResponse,
    LoginRequest,
    LoginResponse,
)
from app.modules.identity.service import (
    authenticate_user,
    change_user_password,
    create_access_token,
    create_user,
    delete_user,
    list_users,
    update_user,
    update_user_active_status,
)
from app.modules.identity.user import User


router = APIRouter(prefix="/auth")


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = authenticate_user(db=db, username=payload.username, password=payload.password)
    token, expires_in = create_access_token(user)
    return LoginResponse(
        access_token=token,
        expires_in=expires_in,
        username=user.username,
        role=user.role,
        force_password_change=user.force_password_change,
    )


@router.get("/me", response_model=CurrentUserRead)
def get_current_account(current_user: User = Depends(get_current_user)) -> CurrentUserRead:
    return CurrentUserRead(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
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
    return ChangePasswordResponse(message="密码修改成功。")


@router.get("/users", response_model=list[AdminUserRead])
def get_admin_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.ACCOUNT_READ)),
) -> list[AdminUserRead]:
    return [AdminUserRead.model_validate(user) for user in list_users(db)]


@router.post("/users", response_model=AdminUserRead, status_code=201)
def create_admin_user(
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ACCOUNT_CREATE)),
) -> AdminUserRead:
    user = create_user(
        db=db,
        actor=current_user,
        username=payload.username,
        password=payload.password,
        role=payload.role.value,
        is_active=payload.is_active,
        force_password_change=payload.force_password_change,
    )
    return AdminUserRead.model_validate(user)


@router.patch("/users/{user_id}", response_model=AdminUserRead)
def update_admin_user(
    user_id: int,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ACCOUNT_UPDATE)),
) -> AdminUserRead:
    user = update_user(
        db=db,
        actor=current_user,
        target_user_id=user_id,
        username=payload.username,
        password=payload.password,
        role=payload.role.value if payload.role else None,
        is_active=payload.is_active,
        force_password_change=payload.force_password_change,
    )
    return AdminUserRead.model_validate(user)


@router.patch("/users/{user_id}/status", response_model=AdminUserRead)
def update_admin_user_status(
    user_id: int,
    payload: AdminUserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ACCOUNT_UPDATE)),
) -> AdminUserRead:
    user = update_user_active_status(
        db=db,
        actor=current_user,
        target_user_id=user_id,
        is_active=payload.is_active,
    )
    return AdminUserRead.model_validate(user)


@router.delete("/users/{user_id}", response_model=DeleteAdminUserResponse)
def delete_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.ACCOUNT_DELETE)),
) -> DeleteAdminUserResponse:
    deleted_username = delete_user(
        db=db,
        actor=current_user,
        target_user_id=user_id,
    )
    return DeleteAdminUserResponse(message=f"管理员账号已删除：{deleted_username}")
