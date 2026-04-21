from enum import Enum

from app.modules.identity.user_role import UserRole


class Permission(str, Enum):
    ACCOUNT_READ = "account:read"
    ACCOUNT_CREATE = "account:create"
    ACCOUNT_UPDATE = "account:update"
    ACCOUNT_DELETE = "account:delete"
    APPOINTMENT_READ_PENDING = "appointment:read_pending"
    APPOINTMENT_AUDIT = "appointment:audit"
    APPOINTMENT_INSPECT = "appointment:inspect"
    APPOINTMENT_CHECK_IN = "appointment:check_in"
    APPOINTMENT_EXPIRE = "appointment:expire"
    APPOINTMENT_EXPIRE_STALE = "appointment:expire_stale"
    APPOINTMENT_HISTORY = "appointment:history"
    DASHBOARD_READ = "dashboard:read"
    LOGS_READ = "logs:read"


OPERATION_PERMISSIONS = {
    Permission.APPOINTMENT_READ_PENDING,
    Permission.APPOINTMENT_AUDIT,
    Permission.APPOINTMENT_INSPECT,
    Permission.APPOINTMENT_CHECK_IN,
    Permission.APPOINTMENT_EXPIRE,
    Permission.APPOINTMENT_EXPIRE_STALE,
    Permission.APPOINTMENT_HISTORY,
    Permission.DASHBOARD_READ,
    Permission.LOGS_READ,
}


ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.MADAO: set(Permission),
    UserRole.MADAO1: set(OPERATION_PERMISSIONS),
    UserRole.MADAO2: {
        Permission.APPOINTMENT_READ_PENDING,
        Permission.APPOINTMENT_AUDIT,
        Permission.APPOINTMENT_INSPECT,
        Permission.APPOINTMENT_EXPIRE,
        Permission.APPOINTMENT_EXPIRE_STALE,
        Permission.APPOINTMENT_HISTORY,
        Permission.DASHBOARD_READ,
    },
    UserRole.MADAO3: {
        Permission.APPOINTMENT_INSPECT,
        Permission.APPOINTMENT_CHECK_IN,
    },
    UserRole.MADAO4: {
        Permission.APPOINTMENT_INSPECT,
        Permission.APPOINTMENT_HISTORY,
        Permission.DASHBOARD_READ,
        Permission.LOGS_READ,
    },
}


def role_has_permission(role: str, permission: Permission) -> bool:
    try:
        user_role = UserRole(role)
    except ValueError:
        return False
    return permission in ROLE_PERMISSIONS.get(user_role, set())
