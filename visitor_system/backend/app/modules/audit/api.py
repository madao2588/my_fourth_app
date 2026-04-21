from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.audit.schemas import AdminLogEntry, AdminOverviewResponse, AdminStatsResponse
from app.modules.audit.service import get_admin_overview, get_admin_stats, get_recent_logs
from app.modules.identity.deps import require_permission
from app.modules.identity.permissions import Permission
from app.modules.identity.user import User


admin_router = APIRouter()


@admin_router.get("/stats", response_model=AdminStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.DASHBOARD_READ)),
) -> AdminStatsResponse:
    return AdminStatsResponse(**get_admin_stats(db=db))


@admin_router.get("/overview", response_model=AdminOverviewResponse)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.DASHBOARD_READ)),
) -> AdminOverviewResponse:
    return AdminOverviewResponse(**get_admin_overview(db=db))


@admin_router.get("/logs", response_model=list[AdminLogEntry])
def get_admin_logs(
    limit: int = Query(default=30, ge=1, le=200),
    level: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    _: User = Depends(require_permission(Permission.LOGS_READ)),
) -> list[AdminLogEntry]:
    return [
        AdminLogEntry(**item)
        for item in get_recent_logs(
            limit=limit,
            level=level,
            keyword=keyword,
            date_from=date_from,
            date_to=date_to,
        )
    ]
