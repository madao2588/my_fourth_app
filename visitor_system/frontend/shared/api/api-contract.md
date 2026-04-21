# 前后端接口契约

本文档用于统一微信小程序、Web 前端与后端 API 的字段命名、返回结构和行为预期。当前后端运行环境为 `Python 3.14`。

## 1. 通用约定

- 接口前缀：`/api/v1`
- 数据格式：`application/json`
- 认证方式：管理员接口使用 `Authorization: Bearer <token>`
- 时间字段：返回 ISO 风格字符串或后端序列化时间字符串
- 状态值：前后端统一使用英文枚举，前端自行映射中文显示

错误响应统一格式：

```json
{
  "success": false,
  "error": {
    "code": "http_error",
    "message": "Invalid credentials."
  },
  "detail": "Invalid credentials."
}
```

## 2. 状态枚举

| 状态值 | 含义 |
| --- | --- |
| `pending` | 待审批 |
| `approved` | 已通过 |
| `checked_in` | 已签到 |
| `rejected` | 已拒绝 |
| `expired` | 已过期 |

## 3. 通用预约对象

```json
{
  "id": 1,
  "name": "张三",
  "phone": "13800138000",
  "reason": "商务拜访",
  "target_person": "李经理",
  "appointment_time": "2026-04-08T10:00:00+00:00",
  "status": "approved",
  "admin_remark": "同意来访",
  "approved_by": "madao",
  "approved_at": "2026-04-08T08:30:00+00:00",
  "checked_in_at": null,
  "expired_at": null,
  "access_code": "A8B2C3",
  "created_at": "2026-04-08T07:55:00+00:00"
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | integer | 预约主键 |
| `name` | string | 访客姓名 |
| `phone` | string | 访客手机号 |
| `reason` | string | 来访事由 |
| `target_person` | string | 受访人 |
| `appointment_time` | string(datetime) | 预约时间，使用 ISO 8601 格式 |
| `status` | string | 预约状态 |
| `admin_remark` | string | 审批备注 |
| `approved_by` | string/null | 审批人 |
| `approved_at` | string/null | 审批时间 |
| `checked_in_at` | string/null | 签到时间 |
| `expired_at` | string/null | 过期时间 |
| `access_code` | string | 6 位入场码 |
| `created_at` | string | 创建时间 |

## 4. 访客接口

### 4.1 提交预约

- 方法：`POST`
- 路径：`/api/v1/apply`

请求体：

```json
{
  "name": "张三",
  "phone": "13800138000",
  "reason": "商务拜访",
  "target_person": "李经理",
  "appointment_time": "2026-04-08T10:00:00+00:00"
}
```

响应体：

```json
{
  "status": "success",
  "application_id": 1,
  "access_code": "A8B2C3"
}
```

### 4.2 查询最近预约

- 方法：`GET`
- 路径：`/api/v1/query/{phone}`

响应体：

```json
{
  "found": true,
  "record": {
    "id": 1,
    "name": "张三",
    "phone": "13800138000",
    "reason": "商务拜访",
    "target_person": "李经理",
    "appointment_time": "2026-04-08T10:00:00+00:00",
    "status": "approved",
    "admin_remark": "同意来访",
    "approved_by": "madao",
    "approved_at": "2026-04-08T08:30:00+00:00",
    "checked_in_at": null,
    "expired_at": null,
    "access_code": "A8B2C3",
    "created_at": "2026-04-08T07:55:00+00:00"
  }
}
```

### 4.3 获取本地二维码

- 方法：`GET`
- 路径：`/api/v1/pass-qr/{access_code}`

说明：

- 返回类型为 `image/svg+xml`
- 当前 Web 端二维码只编码 `access_code`
- 不再将姓名、手机号、受访人等明文信息发送给第三方二维码服务

## 5. 认证接口

### 5.1 管理员登录

- 方法：`POST`
- 路径：`/api/v1/auth/login`

请求体：

```json
{
  "username": "madao",
  "password": "666666"
}
```

响应体：

```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "expires_in": 28800,
  "username": "madao",
  "role": "madao",
  "force_password_change": false
}
```

### 5.2 获取当前管理员信息

- 方法：`GET`
- 路径：`/api/v1/auth/me`

响应体：

```json
{
  "id": 1,
  "username": "madao",
  "role": "madao",
  "is_active": true,
  "force_password_change": false,
  "created_at": "2026-04-08T07:55:00+00:00"
}
```

### 5.3 修改管理员密码

- 方法：`POST`
- 路径：`/api/v1/auth/change-password`

请求体：

```json
{
  "current_password": "666666",
  "new_password": "777777"
}
```

响应体：

```json
{
  "success": true,
  "message": "密码修改成功。"
}
```

### 5.4 获取管理员账号列表

- 方法：`GET`
- 路径：`/api/v1/auth/users`

响应体：

```json
[
  {
    "id": 1,
    "username": "madao",
    "role": "madao",
    "is_active": true,
    "force_password_change": false,
    "created_at": "2026-04-08T07:55:00+00:00"
  }
]
```

### 5.5 新增管理员账号

- 方法：`POST`
- 路径：`/api/v1/auth/users`

请求体：

```json
{
  "username": "madao_ops",
  "password": "666666",
  "role": "madao4",
  "is_active": true,
  "force_password_change": false
}
```

响应体：

```json
{
  "id": 2,
  "username": "madao_ops",
  "role": "madao4",
  "is_active": true,
  "force_password_change": false,
  "created_at": "2026-04-08T08:30:00+00:00"
}
```

### 5.6 更新管理员账号

- 方法：`PATCH`
- 路径：`/api/v1/auth/users/{user_id}`

请求体：

```json
{
  "username": "madao_ops_v2",
  "password": "777777",
  "role": "madao2",
  "is_active": true,
  "force_password_change": true
}
```

响应体：

```json
{
  "id": 2,
  "username": "madao_ops_v2",
  "role": "madao2",
  "is_active": true,
  "force_password_change": true,
  "created_at": "2026-04-08T08:30:00+00:00"
}
```

### 5.7 删除管理员账号

- 方法：`DELETE`
- 路径：`/api/v1/auth/users/{user_id}`

响应体：

```json
{
  "success": true,
  "message": "管理员账号已删除：madao_ops_v2"
}
```

### 5.8 更新管理员账号状态

- 方法：`PATCH`
- 路径：`/api/v1/auth/users/{user_id}/status`

请求体：

```json
{
  "is_active": false
}
```

响应体：

```json
{
  "id": 2,
  "username": "madao_ops",
  "role": "madao4",
  "is_active": false,
  "force_password_change": false,
  "created_at": "2026-04-08T08:30:00+00:00"
}
```

## 6. 管理员接口

### 6.1 获取待审批列表

- 方法：`GET`
- 路径：`/api/v1/admin/pending`

响应体为预约对象数组。

### 6.2 审批预约

- 方法：`PUT`
- 路径：`/api/v1/admin/approve/{record_id}`

请求体：

```json
{
  "action": "approve",
  "remark": "同意来访"
}
```

或：

```json
{
  "action": "reject",
  "remark": "当天无接待安排"
}
```

响应体为更新后的预约对象。

### 6.3 预览预约详情

- 方法：`POST`
- 路径：`/api/v1/admin/inspect`

请求体：

```json
{
  "access_code": "A8B2C3"
}
```

响应体为预约对象。

### 6.4 现场签到

- 方法：`POST`
- 路径：`/api/v1/admin/check-in`
- 签到成功后 `status` 为 `checked_in`，`checked_in_at` 为签到时间。

请求体：

```json
{
  "access_code": "A8B2C3"
}
```

响应体为更新后的预约对象。

### 6.5 单条手动过期

- 方法：`POST`
- 路径：`/api/v1/admin/expire`

请求体：

```json
{
  "access_code": "A8B2C3"
}
```

响应体为更新后的预约对象。

### 6.6 批量过期清理

- 方法：`POST`
- 路径：`/api/v1/admin/expire-stale`

响应体：

```json
{
  "expired_count": 3,
  "threshold_hours": 48
}
```

### 6.7 获取统计卡片

- 方法：`GET`
- 路径：`/api/v1/admin/stats`

响应体：

```json
{
  "total": 12,
  "pending": 3,
  "approved": 5,
  "rejected": 2,
  "expired": 2,
  "checked_in": 4
}
```

- 当前状态统计口径：`approved` 表示仍处于已通过且未签到、未过期的预约。
- 当前状态统计口径：`checked_in` 表示显式已签到状态的预约。

### 6.8 获取今日看板与最近动态

- 方法：`GET`
- 路径：`/api/v1/admin/overview`

响应体：

```json
{
  "today": {
    "created": 5,
    "pending": 1,
    "approved": 2,
    "rejected": 1,
    "checked_in": 1,
    "expired": 0
  },
  "recent_activity": [
    {
      "event_type": "approved",
      "title": "预约已审批",
      "description": "张三的预约已通过",
      "happened_at": "2026-04-08T08:30:00+00:00",
      "appointment_id": 1,
      "visitor_name": "张三",
      "phone": "13800138000",
      "access_code": "A8B2C3",
      "status": "approved"
    }
  ]
}
```

### 6.9 获取历史记录

- 方法：`GET`
- 路径：`/api/v1/admin/list`

支持查询参数：

- `status`
- `phone`
- `date_from`
- `date_to`
- `page`
- `page_size`

响应体：

```json
{
  "items": [
    {
      "id": 1,
      "name": "张三",
      "phone": "13800138000",
      "reason": "商务拜访",
      "target_person": "李经理",
      "appointment_time": "2026-04-08T10:00:00+00:00",
      "status": "approved",
      "admin_remark": "同意来访",
      "approved_by": "madao",
      "approved_at": "2026-04-08T08:30:00+00:00",
      "checked_in_at": null,
      "expired_at": null,
      "access_code": "A8B2C3",
      "created_at": "2026-04-08T07:55:00+00:00"
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 10
}
```

### 6.10 获取系统日志

- 方法：`GET`
- 路径：`/api/v1/admin/logs`

支持查询参数：

- `limit`
- `level`
- `keyword`
- `date_from`
- `date_to`

响应体：

```json
[
  {
    "timestamp": "2026-04-08 10:44:37",
    "level": "INFO",
    "message": "appointment_audited id=1 action=approve status=approved admin=madao access_code=A8B2C3 remark=同意来访",
    "raw": "2026-04-08 10:44:37 | INFO | appointment_audited id=1 action=approve status=approved admin=madao access_code=A8B2C3 remark=同意来访"
  }
]
```

## 7. 前端联调建议

- 前端不要自行生成入场码
- 状态值统一使用后端返回的英文枚举
- 二维码内容当前统一只包含 `access_code`
- Web 端二维码统一通过 `/api/v1/pass-qr/{access_code}` 本地生成
- 小程序与 Web 尽量共用同一套中文状态映射
- 历史记录分页以服务端返回的 `page`、`page_size`、`total` 为准

## 8. 错误处理建议

当前后端会在校验或业务失败时返回 HTTP 错误。前端建议优先显示：

1. 后端返回的 `detail`
2. 如果没有 `detail`，再显示兜底错误提示

## 9. 备注

本文档描述的是当前仓库已实现的接口能力。后续如果新增接口或字段，应优先先更新这里，再同步修改前端请求层和页面逻辑。
