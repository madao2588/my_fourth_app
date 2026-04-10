# 访客系统后端说明

## 1. 模块定位

本目录是访客预约系统的后端服务，负责承接访客申请、管理员审批、签到核验、历史查询、自动过期、日志记录和部署支撑。

当前后端运行环境为 `Python 3.14`，核心框架为 `FastAPI`。项目已经从早期单文件原型拆分为可持续演进的模块化结构。

## 2. 技术栈

- Python 3.14
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- Loguru
- Uvicorn
- SQLite
- PostgreSQL
- pytest

当前开发默认使用 SQLite，但结构已经兼容 PostgreSQL。

## 3. 目录结构

```text
backend/
├─ app/
│  ├─ api/
│  │  ├─ deps.py
│  │  ├─ router.py
│  │  └─ routes/
│  │     ├─ admin.py
│  │     ├─ auth.py
│  │     └─ visitor.py
│  ├─ core/
│  │  ├─ config.py
│  │  └─ logging.py
│  ├─ db/
│  │  ├─ base.py
│  │  └─ session.py
│  ├─ models/
│  │  ├─ appointment.py
│  │  └─ user.py
│  ├─ schemas/
│  │  ├─ appointment.py
│  │  ├─ auth.py
│  │  └─ common.py
│  ├─ services/
│  │  ├─ appointment_service.py
│  │  ├─ auth_service.py
│  │  └─ log_service.py
│  ├─ tasks/
│  │  └─ expiration.py
│  └─ main.py
├─ alembic/
├─ deploy/
├─ logs/
├─ scripts/
├─ tests/
├─ .env.example
├─ alembic.ini
├─ main.py
└─ requirements.txt
```

## 4. 当前接口

### 访客接口

- `POST /api/v1/apply`
- `GET /api/v1/query/{phone}`

### 认证接口

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`
- `POST /api/v1/auth/users`
- `GET /api/v1/auth/users`
- `PATCH /api/v1/auth/users/{user_id}/status`

### 管理员接口

- `GET /api/v1/admin/pending`
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/list`
- `GET /api/v1/admin/logs`
- `PUT /api/v1/admin/approve/{record_id}`
- `POST /api/v1/admin/inspect`
- `POST /api/v1/admin/check-in`
- `POST /api/v1/admin/expire`
- `POST /api/v1/admin/expire-stale`

### 系统接口

- `GET /health`

## 5. 当前业务闭环

系统目前已经支持以下完整流转：

1. 访客提交预约申请
2. 后端生成 6 位入场码
3. 管理员登录后台
4. 审批通过或拒绝
5. 访客按手机号查询结果
6. 审批通过后展示电子凭证和二维码
7. 管理员通过入场码或扫码预览预约
8. 管理员执行现场签到
9. 未签到预约可以手动过期或自动过期
10. 管理员通过历史记录、概览和日志查看痕迹

## 6. 管理员账号能力

当前管理员体系已经支持：

- 登录
- 当前账号查询
- 修改密码
- 默认管理员首次登录强制改密
- 新增管理员账号
- 启用 / 禁用管理员账号

系统首次启动时会初始化开发管理员：

- 用户名：`admin`
- 密码：`admin123456`

说明：

- 默认管理员首次登录后会被标记为必须先改密
- 在改密完成前，后台审批、统计、日志等接口会被限制访问
- 不能禁用自己的账号
- 不能把最后一个启用中的管理员禁用

## 7. 配置项

示例文件见：

- [.env.example](/d:/projects/my_fourth_app/visitor_system/backend/.env.example)

常用环境变量包括：

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_EXPIRE_MINUTES`
- `DEFAULT_ADMIN_USERNAME`
- `DEFAULT_ADMIN_PASSWORD`
- `APPOINTMENT_EXPIRE_HOURS`
- `AUTO_EXPIRE_ENABLED`
- `AUTO_EXPIRE_INTERVAL_MINUTES`
- `DATABASE_WAIT_TIMEOUT_SECONDS`
- `DATABASE_WAIT_INTERVAL_SECONDS`
- `LOG_LEVEL`
- `LOG_DIR`

关于 `DATABASE_URL`：

- 默认：`sqlite:///...`
- PostgreSQL 推荐：`postgresql+psycopg://user:password@host:5432/dbname`
- 如果写成 `postgres://...`，系统会自动规范化

## 8. 本地启动

```bash
cd visitor_system/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

访问地址：

- Swagger：`http://127.0.0.1:8000/docs`
- ReDoc：`http://127.0.0.1:8000/redoc`
- 健康检查：`http://127.0.0.1:8000/health`
- Web 入口：`http://127.0.0.1:8000/`

## 9. 数据库迁移

项目已从自动 `create_all()` 切换到 Alembic 迁移驱动。

常用命令：

```bash
alembic upgrade head
alembic revision -m "your message"
```

当前迁移：

- `20260408_0001_initial_schema`
- `20260408_0002_appointment_audit_fields`
- `20260408_0003_user_security_fields`
- `20260410_0004_appointment_time_datetime`

- `appointment_time` ?????? ISO 8601 ???????????? `2026-04-08T10:00:00+00:00`

## 10. 自动过期

系统支持三种过期处理方式：

### Web 后台手动触发

管理员可通过按钮触发 `POST /api/v1/admin/expire-stale`

### 命令行脚本

```bash
cd visitor_system/backend
python scripts/expire_appointments.py
```

### 服务启动后自动轮询

当 `AUTO_EXPIRE_ENABLED=true` 时，应用启动后会按 `AUTO_EXPIRE_INTERVAL_MINUTES` 周期扫描超时预约。

## 11. 数据库等待机制

为提高 Docker + PostgreSQL 场景下的稳定性，容器启动时会先执行：

```bash
python scripts/wait_for_db.py
```

确认数据库可用后，再继续：

```bash
alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 12. 日志

当前已接入 `Loguru`，日志同时输出到控制台和文件：

- [backend.log](/d:/projects/my_fourth_app/visitor_system/backend/logs/backend.log)

管理员后台也可以通过 `/api/v1/admin/logs` 查看最近日志。

## 13. 统一错误响应

后端已统一错误结构，便于前端联调和接口消费：

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Invalid request parameter: body.name"
  },
  "detail": "Invalid request parameter: body.name"
}
```

## 14. 测试

当前后端已接入 pytest，覆盖内容包括：

- 健康检查
- Web 页面托管
- 预约提交
- 手机号查询
- 管理员登录
- 当前账号查询
- 修改密码
- 默认管理员首次登录强制改密
- 新增管理员账号
- 管理员账号启用 / 禁用
- 审批
- 签到
- 详情预览
- 单条过期
- 批量过期
- 历史记录筛选与分页
- 统计接口
- 概览接口
- 日志查询接口
- PostgreSQL URL 规范化
- 数据库等待脚本

运行方式：

```bash
cd visitor_system/backend
python -m pytest
```

## 15. Docker 部署

项目提供：

- [Dockerfile](/d:/projects/my_fourth_app/visitor_system/backend/deploy/Dockerfile)
- [nginx.conf](/d:/projects/my_fourth_app/visitor_system/backend/deploy/nginx.conf)
- [docker-compose.yml](/d:/projects/my_fourth_app/docker-compose.yml)
- [docker-compose.postgres.yml](/d:/projects/my_fourth_app/docker-compose.postgres.yml)

默认 SQLite 演示模式：

```bash
docker compose up --build
```

PostgreSQL 模式：

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build
```

## 16. 后续建议

如果继续往更正式的交付版本推进，建议优先做：

- PostgreSQL 正式切换
- 更细的管理员角色权限模型
- 登录限流与安全策略
- 更正式的审计表
- 生产环境配置拆分
