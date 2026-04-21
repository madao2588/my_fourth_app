import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import AUTO_EXPIRE_ENABLED, FRONTEND_WEB_DIR
from app.core.logging import get_logger, setup_logging
from app.db.session import check_database_connection, init_db
from app.modules.router import api_router
from app.modules.scheduler.service import run_expiration_worker
from app.schemas.common import ErrorResponse, HealthResponse


setup_logging()
logger = get_logger()


def _error_response(*, status_code: int, code: str, message: str) -> JSONResponse:
    payload = ErrorResponse(
        error={
            "code": code,
            "message": message,
        },
        detail=message,
    )
    return JSONResponse(status_code=status_code, content=payload.model_dump())


def create_application(init_db_on_startup: bool = True) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI):
        stop_event = asyncio.Event()
        expiration_task: asyncio.Task | None = None

        if init_db_on_startup:
            init_db()

        if AUTO_EXPIRE_ENABLED and init_db_on_startup:
            expiration_task = asyncio.create_task(run_expiration_worker(stop_event))
            logger.info("Automatic expiration scheduler enabled.")

        yield

        if expiration_task is not None:
            stop_event.set()
            await expiration_task

    application = FastAPI(
        title="访客系统 API",
        version="0.1.0",
        description="访客预约、审批、签到与审计后台服务。",
        lifespan=lifespan,
    )
    application.include_router(api_router, prefix="/api/v1")

    @application.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, str):
            message = exc.detail
        else:
            message = "请求失败。"
        return _error_response(
            status_code=exc.status_code,
            code="http_error",
            message=message,
        )

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        first_error = exc.errors()[0] if exc.errors() else None
        if first_error:
            location = ".".join(str(item) for item in first_error.get("loc", []))
            message = f"请求参数无效：{location}"
        else:
            message = "请求参数无效。"
        return _error_response(
            status_code=422,
            code="validation_error",
            message=message,
        )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled application error: {}", exc)
        return _error_response(
            status_code=500,
            code="internal_error",
            message="服务器内部错误。",
        )

    if FRONTEND_WEB_DIR.exists():
        src_dir = FRONTEND_WEB_DIR / "src"
        public_dir = FRONTEND_WEB_DIR / "public"

        if src_dir.exists():
            application.mount("/src", StaticFiles(directory=src_dir), name="web-src")
        if public_dir.exists():
            application.mount("/public", StaticFiles(directory=public_dir), name="web-public")

        @application.get("/", include_in_schema=False)
        def web_index() -> FileResponse:
            return FileResponse(FRONTEND_WEB_DIR / "index.html")

        @application.get("/index.html", include_in_schema=False)
        def web_index_file() -> FileResponse:
            return FileResponse(FRONTEND_WEB_DIR / "index.html")

        @application.get("/visitor.html", include_in_schema=False)
        def web_visitor() -> FileResponse:
            return FileResponse(FRONTEND_WEB_DIR / "visitor.html")

        @application.get("/admin-login.html", include_in_schema=False)
        def web_admin_login() -> FileResponse:
            return FileResponse(FRONTEND_WEB_DIR / "admin-login.html")

        @application.get("/admin.html", include_in_schema=False)
        def web_admin() -> FileResponse:
            return FileResponse(FRONTEND_WEB_DIR / "admin.html")

    @application.get("/health", tags=["system"], response_model=HealthResponse)
    def health_check() -> HealthResponse:
        database_ok = check_database_connection()
        return HealthResponse(
            status="ok",
            database="ok" if database_ok else "error",
        )

    return application


app = create_application()
