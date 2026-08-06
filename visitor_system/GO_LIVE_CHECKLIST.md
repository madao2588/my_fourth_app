# 访客系统下一步与交付检查清单

这份文档用于回答两个问题：

1. 现在这套本地原型接下来该做什么。
2. 上线前最少要检查哪些点。

## 1. 当前建议顺序

1. 收口本地演示环境
   处理 smoke/regression 留下的测试账号和测试预约，保证后台列表可读。
2. 跑完整体验收
   按真实业务链路走一遍访客申请、审批、签到、历史、日志和角色权限。
3. 处理小程序真机链路
   把 `trial` / `release` 的 API 地址切到真实 HTTPS 域名，并配置微信合法域名。
4. 最后做公网部署
   先上 API，再决定是否把 Web 管理后台一起同源部署。

## 2. 本地演示环境收口

### 2.1 默认管理员

- `madao / 666666`
- `madao1 / 666666`
- `madao2 / 666666`
- `madao3 / 666666`
- `madao4 / 666666`

角色含义以后台展示为准。

### 2.2 清理测试脏数据

先看将删除哪些数据：

```bash
cd visitor_system/backend
python scripts/cleanup_demo_data.py
```

确认后执行真正清理：

```bash
cd visitor_system/backend
python scripts/cleanup_demo_data.py --apply
```

脚本默认会处理两类数据：

- smoke/regression 留下的影子管理员账号，如 `madao2_1234567890`
- smoke/regression 留下的测试预约记录

不会删除以下内置账号：

- `madao`
- `madao1`
- `madao2`
- `madao3`
- `madao4`

## 3. 完整验收清单

### 3.1 后端基础

- `GET /health` 返回 `200`
- `pytest -q` 通过
- 管理员默认账号可登录

建议命令：

```bash
cd visitor_system/backend
python -m pytest -q
```

### 3.2 Web 验收

建议命令：

```bash
cd visitor_system/frontend/web
npm run smoke
```

手工再走一遍以下链路：

1. 打开 `visitor.html`
2. 提交一条新预约
3. 用手机号查询状态
4. 打开 `admin-login.html`
5. 用 `madao / 666666` 登录
6. 在待审批中通过预约
7. 在现场操作中用入场码签到
8. 在历史记录中筛到该记录
9. 在系统日志中确认有审批和签到日志
10. 分别用 `madao2`、`madao3`、`madao4` 登录，确认可见模块符合权限

## 4. 小程序真机准备

小程序运行时配置文件：

- [runtime.js](frontend/miniprogram/config/runtime.js)

当前约定：

- `develop`：本地开发者工具联调，可用 `http://127.0.0.1:8012`
- `trial`：预发布，必须填真实 HTTPS API 地址
- `release`：正式版，必须填真实 HTTPS API 地址

### 4.1 开发者工具本地联调

- 只在开发者工具内调试时，`develop.apiBaseUrl` 可以指向本机后端
- `project.private.config.json` 里的 `urlCheck=false` 只对本地开发工具有效
- 这不代表手机真机或预览环境也能访问本地地址

### 4.2 真机预览 / 正式发布

必须同时满足：

1. `trial` / `release` 使用真实 `https://` API 域名
2. 该域名已配置到微信小程序后台的 `request 合法域名`
3. 后端公网可访问

## 5. 公网部署前最少准备

### 5.1 后端

上线前至少确认这些环境变量：

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `DEFAULT_ADMIN_PASSWORD`
- `FRONTEND_WEB_DIR`
- `CORS_ALLOW_ORIGINS`（仅当 Web 和 API 不同源时需要）

参考文件：

- [backend/.env.example](backend/.env.example)

### 5.2 数据库

- 本地演示可用 SQLite
- 正式环境建议切 PostgreSQL

### 5.3 部署策略

建议顺序：

1. 先部署 API
2. 确认小程序真机能走通
3. 再决定 Web 管理后台是否跟 API 同源部署

## 6. 当前最值得继续做的事

如果继续沿这条线推进，优先级建议是：

1. 保持本地演示库干净
2. 固定一份验收流程
3. 准备 HTTPS API 域名
4. 填好小程序 `trial` / `release` 地址
5. 再做公网部署
