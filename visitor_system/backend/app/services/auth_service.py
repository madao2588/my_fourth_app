import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone

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
from app.models.user import User


logger = get_logger()


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
        "exp": int(expires_at.timestamp()),
    }
    token = _encode_token(payload)
    return token, int(expires_delta.total_seconds())


def decode_access_token(token: str) -> dict:
    try:
        payload = _decode_token(token)
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="登录状态无效或已过期",
            )
        return payload
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态无效或已过期",
        ) from exc


def authenticate_user(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        logger.warning("admin_login_failed username={}", username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    if not user.is_active:
        logger.warning("admin_login_blocked username={}", username)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号已被禁用",
        )
    logger.info("admin_login_success username={} user_id={}", user.username, user.id)
    return user


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


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
            detail="Current password is incorrect.",
        )
    if current_password == new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password.",
        )

    user.password_hash = hash_password(new_password)
    user.force_password_change = False
    db.commit()
    db.refresh(user)
    logger.info("admin_password_changed username={} user_id={}", user.username, user.id)
    return user


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.created_at.asc(), User.id.asc()).all()


def create_user(
    db: Session,
    *,
    actor: User,
    username: str,
    password: str,
    is_active: bool,
    force_password_change: bool,
) -> User:
    normalized_username = username.strip()
    if get_user_by_username(db, normalized_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists.",
        )

    user = User(
        username=normalized_username,
        password_hash=hash_password(password),
        is_active=is_active,
        force_password_change=force_password_change,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(
        "admin_account_created actor_username={} actor_user_id={} target_username={} target_user_id={} is_active={} force_password_change={}",
        actor.username,
        actor.id,
        user.username,
        user.id,
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
    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if actor.id == user.id and not is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable your own account.",
        )

    if not is_active:
        active_count = db.query(User).filter(User.is_active.is_(True)).count()
        if user.is_active and active_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one active administrator must remain.",
            )

    user.is_active = is_active
    db.commit()
    db.refresh(user)
    logger.info(
        "admin_account_status_updated actor_username={} actor_user_id={} target_username={} target_user_id={} is_active={}",
        actor.username,
        actor.id,
        user.username,
        user.id,
        user.is_active,
    )
    return user


def seed_default_admin(db: Session) -> None:
    existing = get_user_by_username(db, DEFAULT_ADMIN_USERNAME)
    if existing:
        return

    admin = User(
        username=DEFAULT_ADMIN_USERNAME,
        password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
        is_active=True,
        force_password_change=True,
    )
    db.add(admin)
    db.commit()
    logger.info("default_admin_seeded username={}", DEFAULT_ADMIN_USERNAME)


def _urlsafe_b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _urlsafe_b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def _encode_token(payload: dict) -> str:
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    header_segment = _urlsafe_b64encode(
        json.dumps(header, separators=(",", ":")).encode("utf-8")
    )
    payload_segment = _urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )
    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    signature = hmac.new(
        JWT_SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    signature_segment = _urlsafe_b64encode(signature)
    return f"{header_segment}.{payload_segment}.{signature_segment}"


def _decode_token(token: str) -> dict:
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError as exc:
        raise ValueError("invalid token format") from exc

    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    expected_signature = hmac.new(
        JWT_SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    actual_signature = _urlsafe_b64decode(signature_segment)

    if not hmac.compare_digest(expected_signature, actual_signature):
        raise ValueError("invalid signature")

    header = json.loads(_urlsafe_b64decode(header_segment).decode("utf-8"))
    if header.get("alg") != JWT_ALGORITHM:
        raise ValueError("invalid algorithm")

    return json.loads(_urlsafe_b64decode(payload_segment).decode("utf-8"))
