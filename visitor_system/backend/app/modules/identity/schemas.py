from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.identity.user_role import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    username: str
    role: UserRole
    force_password_change: bool


class CurrentUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: UserRole
    is_active: bool
    force_password_change: bool
    avatar_image: str | None = None
    created_at: datetime


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6, max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)


class ChangePasswordResponse(BaseModel):
    success: bool = True
    message: str


class CurrentUserAvatarUpdateRequest(BaseModel):
    avatar_image: str | None = Field(default=None, max_length=500_000)


class CurrentUserAvatarUpdateResponse(BaseModel):
    success: bool = True
    message: str
    user: CurrentUserRead


class AdminUserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = UserRole.MADAO4
    is_active: bool = True
    force_password_change: bool = False


class AdminUserUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role: UserRole | None = None
    is_active: bool | None = None
    force_password_change: bool | None = None

    @model_validator(mode="after")
    def validate_payload(self):
        if all(
            value is None
            for value in (
                self.username,
                self.password,
                self.role,
                self.is_active,
                self.force_password_change,
            )
        ):
            raise ValueError("至少提供一个要修改的字段。")
        return self


class AdminUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: UserRole
    is_active: bool
    force_password_change: bool
    created_at: datetime


class AdminUserStatusUpdateRequest(BaseModel):
    is_active: bool


class DeleteAdminUserResponse(BaseModel):
    success: bool = True
    message: str
