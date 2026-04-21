from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.permissions import Permission, role_has_permission
from app.modules.identity.service import decode_access_token
from app.modules.identity.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录凭证无效或已过期。",
        )

    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="当前账号不可用。",
        )
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.force_password_change:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="请先修改密码后再访问管理后台。",
        )
    return user


def require_permission(permission: Permission):
    def dependency(user: User = Depends(get_current_admin)) -> User:
        if not role_has_permission(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="当前角色没有执行此操作的权限。",
            )
        return user

    return dependency
