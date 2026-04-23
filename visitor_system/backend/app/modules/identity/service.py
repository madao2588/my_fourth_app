import base64
import binascii
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import (
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ADMIN_USERNAME,
    JWT_ALGORITHM,
    JWT_EXPIRE_MINUTES,
    JWT_SECRET_KEY,
)
from app.core.logging import get_logger
from app.modules.identity.user import User
from app.modules.identity.user_role import ROLE_SORT_ORDER, UserRole


logger = get_logger()
MAX_AVATAR_IMAGE_BYTES = 256 * 1024
ALLOWED_AVATAR_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def hash_password(password: str, salt: bytes | None = None) -> str:
    password_bytes = password.encode("utf-8")
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password_bytes, salt, 100_000)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_b64, digest_b64 = password_hash.split("$", 1)
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(digest_b64.encode())
    except ValueError:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return hmac.compare_digest(actual, expected)


def create_access_token(user: User) -> tuple[str, int]:
    expires_delta = timedelta(minutes=JWT_EXPIRE_MINUTES)
    expires_at = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role,
        "exp": expires_at,
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, int(expires_delta.total_seconds())


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub", "user_id", "role"]},
        )
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="登录状态无效或已过期。",
            )
        return payload
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态无效或已过期。",
        ) from exc


def authenticate_user(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        logger.warning("admin_login_failed username={}", username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误。",
        )
    if not user.is_active:
        logger.warning("admin_login_blocked username={}", username)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号已被禁用。",
        )
    logger.info("admin_login_success username={} user_id={}", user.username, user.id)
    return user


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def _normalize_username(username: str) -> str:
    normalized_username = (username or "").strip()
    if not normalized_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名不能为空。",
        )
    return normalized_username


def _normalize_role(role: str) -> str:
    try:
        return UserRole(role).value
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="角色类型无效。",
        ) from exc


def _ensure_manageable_target(actor: User, target: User) -> None:
    if actor.id == target.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能通过管理员管理功能修改或删除当前登录账号。",
        )


def _ensure_username_available(db: Session, username: str, current_user_id: int | None = None) -> None:
    existing_user = get_user_by_username(db, username)
    if existing_user and existing_user.id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在。",
        )


def _ensure_last_active_account_not_removed(db: Session, target: User, next_is_active: bool) -> None:
    if next_is_active or not target.is_active:
        return

    active_count = db.query(User).filter(User.is_active.is_(True)).count()
    if active_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="至少需要保留一个启用中的管理员账号。",
        )


def normalize_avatar_image(avatar_image: str | None) -> str | None:
    normalized_value = (avatar_image or "").strip()
    if not normalized_value:
        return None

    header, separator, encoded = normalized_value.partition(",")
    if separator != "," or not header.startswith("data:") or ";base64" not in header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="头像图片格式无效。",
        )

    media_type = header[5:].split(";", 1)[0].strip().lower()
    if media_type == "image/jpg":
        media_type = "image/jpeg"
    if media_type not in ALLOWED_AVATAR_MEDIA_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="头像图片类型不支持。",
        )

    try:
        decoded = base64.b64decode(encoded.encode("ascii"), validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="头像图片内容无效。",
        ) from exc

    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="头像图片不能为空。",
        )

    if len(decoded) > MAX_AVATAR_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="头像图片过大，请上传更小的图片。",
        )

    return f"data:{media_type};base64,{base64.b64encode(decoded).decode('ascii')}"


def change_user_password(
    db: Session,
    user: User,
    *,
    current_password: str,
    new_password: str,
) -> User:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码不正确。",
        )
    if current_password == new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码不能与当前密码相同。",
        )

    user.password_hash = hash_password(new_password)
    user.force_password_change = False
    db.commit()
    db.refresh(user)
    logger.info("admin_password_changed username={} user_id={}", user.username, user.id)
    return user


def update_current_user_avatar(
    db: Session,
    *,
    user: User,
    avatar_image: str | None,
) -> User:
    user.avatar_image = normalize_avatar_image(avatar_image)
    db.commit()
    db.refresh(user)
    logger.info(
        "admin_avatar_updated username={} user_id={} has_avatar={}",
        user.username,
        user.id,
        bool(user.avatar_image),
    )
    return user


def list_users(db: Session) -> list[User]:
    users = db.query(User).all()
    return sorted(
        users,
        key=lambda item: (
            ROLE_SORT_ORDER.get(item.role, 99),
            item.created_at or datetime.min.replace(tzinfo=timezone.utc),
            item.id,
        ),
    )


def create_user(
    db: Session,
    *,
    actor: User,
    username: str,
    password: str,
    role: str,
    is_active: bool,
    force_password_change: bool,
) -> User:
    normalized_username = _normalize_username(username)
    normalized_role = _normalize_role(role)
    _ensure_username_available(db, normalized_username)

    user = User(
        username=normalized_username,
        password_hash=hash_password(password),
        role=normalized_role,
        is_active=is_active,
        force_password_change=force_password_change,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(
        "admin_account_created actor_username={} actor_user_id={} target_username={} target_user_id={} role={} is_active={} force_password_change={}",
        actor.username,
        actor.id,
        user.username,
        user.id,
        user.role,
        user.is_active,
        user.force_password_change,
    )
    return user


def update_user(
    db: Session,
    *,
    actor: User,
    target_user_id: int,
    username: str | None = None,
    password: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    force_password_change: bool | None = None,
) -> User:
    user = get_user_by_id(db, target_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到对应账号。",
        )

    _ensure_manageable_target(actor, user)

    if username is not None:
        normalized_username = _normalize_username(username)
        _ensure_username_available(db, normalized_username, current_user_id=user.id)
        user.username = normalized_username

    if role is not None:
        user.role = _normalize_role(role)

    if is_active is not None:
        _ensure_last_active_account_not_removed(db, user, is_active)
        user.is_active = is_active

    if password:
        user.password_hash = hash_password(password)
        if force_password_change is None:
            user.force_password_change = True

    if force_password_change is not None:
        user.force_password_change = force_password_change

    db.commit()
    db.refresh(user)
    logger.info(
        "admin_account_updated actor_username={} actor_user_id={} target_username={} target_user_id={} role={} is_active={} force_password_change={}",
        actor.username,
        actor.id,
        user.username,
        user.id,
        user.role,
        user.is_active,
        user.force_password_change,
    )
    return user


def update_user_active_status(
    db: Session,
    *,
    actor: User,
    target_user_id: int,
    is_active: bool,
) -> User:
    return update_user(
        db=db,
        actor=actor,
        target_user_id=target_user_id,
        is_active=is_active,
    )


def delete_user(
    db: Session,
    *,
    actor: User,
    target_user_id: int,
) -> str:
    user = get_user_by_id(db, target_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到对应账号。",
        )

    _ensure_manageable_target(actor, user)
    _ensure_last_active_account_not_removed(db, user, False)

    deleted_username = user.username
    deleted_role = user.role
    db.delete(user)
    db.commit()
    logger.info(
        "admin_account_deleted actor_username={} actor_user_id={} target_username={} target_user_id={} target_role={}",
        actor.username,
        actor.id,
        deleted_username,
        target_user_id,
        deleted_role,
    )
    return deleted_username


def seed_default_admin(db: Session) -> None:
    legacy_admin = get_user_by_username(db, "admin")
    if legacy_admin and not get_user_by_username(db, DEFAULT_ADMIN_USERNAME):
        legacy_admin.username = DEFAULT_ADMIN_USERNAME
        legacy_admin.role = UserRole.MADAO.value

    seeded = 0
    preserved = 0
    for role in UserRole:
        username = role.value
        user = get_user_by_username(db, username)
        if user:
            if user.role != role.value:
                user.role = role.value
            preserved += 1
            continue

        db.add(
            User(
                username=username,
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                role=role.value,
                is_active=True,
                force_password_change=False,
            )
        )
        seeded += 1

    db.commit()
    logger.info(
        "madao_accounts_seeded created_count={} preserved_count={} default_password=****** commander_username={}",
        seeded,
        preserved,
        UserRole.MADAO.value,
    )
