# Alembic 迁移说明

## 1. 模块定位

本目录用于管理数据库结构迁移。当前项目已经从运行时自动建表切换为 Alembic 迁移驱动，数据库结构应通过迁移文件维护，而不是直接依赖 `create_all()`。

## 2. 当前迁移版本

目前仓库内已有：

- `20260408_0001_initial_schema`
  初始化核心表结构
- `20260408_0002_appointment_audit_fields`
  为预约记录补充审批和状态追踪字段

## 3. 常用命令

在 [backend](..) 目录下执行：

```bash
alembic upgrade head
alembic current
alembic history
```

如果修改了 SQLAlchemy 模型，需要生成新的迁移：

```bash
alembic revision --autogenerate -m "describe change"
```

## 4. 当前约定

- 应用启动时不再负责直接建表
- 本地开发前应先执行 `alembic upgrade head`
- Docker 启动时也会先执行迁移
- 默认管理员初始化依然发生在应用启动阶段，但前提是相关表已经存在

## 5. 建议

后续新增字段或调整结构时，建议保持以下顺序：

1. 先改模型
2. 生成迁移
3. 执行迁移
4. 更新测试
5. 更新接口文档
