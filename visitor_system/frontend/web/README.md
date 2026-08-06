# Web 端说明

## 1. 模块定位

本目录承载当前项目的 Web 原型，包含两个主要使用场景：

- 访客侧：提交预约、查询状态、展示电子凭证
- 管理员侧：登录后台、审批、签到、过期、查看统计和日志

当前 Web 端优先目标是把业务闭环跑通，因此实现方式偏轻量，暂未引入前端框架和构建工具。

## 2. 当前目录结构

```text
web/
├─ public/
├─ src/
│  ├─ config/
│  ├─ components/
│  ├─ pages/
│  ├─ services/
│  ├─ store/
│  └─ styles/
│  └─ utils/
├─ index.html
├─ visitor.html
├─ admin.html
└─ README.md
```

## 3. 页面入口

- [index.html](index.html)
  总入口页
- [visitor.html](visitor.html)
  访客页
- [admin.html](admin.html)
  管理员页

## 4. 核心文件职责

- [main.js](src/main.js)
  页面主逻辑，负责表单提交、状态刷新、数据渲染、登录态同步和扫码交互
- `src/pages/admin/`
  管理后台模块骨架
- `src/pages/visitor/`
  访客侧模块骨架
- `src/components/`
  预留的通用组件目录
- `src/store/`
  预留的状态管理目录
- `src/utils/`
  预留的工具函数目录
- [api.js](src/services/api.js)
  所有 API 请求封装
- [main.css](src/styles/main.css)
  当前 Web 原型的主要样式
- [env.js](src/config/env.js)
  Web 前端环境配置，例如后端 API 地址和二维码服务地址

## 5. 当前已实现能力

### 访客侧

- 提交预约申请
- 查询最近一条预约
- 展示预约状态
- 展示审批备注、审批人、审批时间
- 展示电子凭证卡片
- 展示入场码
- 审批通过后展示二维码

### 管理员侧

- 登录 / 退出
- 查看当前管理员账号信息
- 修改管理员密码
- 首次登录强制改密提示
- 新增管理员账号
- 查看管理员账号状态列表
- 启用 / 禁用管理员账号
- 待审批列表
- 审批通过 / 拒绝
- 预约详情预览
- 手动输入入场码签到
- 手动输入入场码过期
- 批量清理超时未签到预约
- 统计卡片
- 今日看板
- 最近动态
- 历史记录筛选
- 历史记录服务端分页
- 系统日志查询
- 日志按级别、关键词、时间范围过滤
- 日志加载更多
- 单条日志复制
- 浏览器摄像头扫码识别
- 扫码后预览预约并确认签到

## 6. 依赖的后端接口

当前 Web 端主要依赖以下接口：

- `GET /health`
- `POST /api/v1/apply`
- `GET /api/v1/query/{phone}`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`
- `POST /api/v1/auth/users`
- `GET /api/v1/auth/users`
- `PATCH /api/v1/auth/users/{user_id}/status`
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

详细字段见：

- [api-contract.md](../shared/api/api-contract.md)

## 7. 当前技术选择

- HTML5
- CSS3
- 原生 JavaScript
- `fetch`
- `localStorage`
- 浏览器 `BarcodeDetector`

当前暂不引入前端框架，主要是为了：

- 快速迭代原型
- 降低前后端联调成本
- 在需求仍频繁变化时保持修改简单

## 8. 使用建议

如果只是本地演示，可以直接打开页面文件或用一个轻量静态服务器承载整个 `web/` 目录。

如果浏览器不支持 `BarcodeDetector`，扫码功能会受限，但管理员仍可手动输入入场码完成签到和过期处理。

## 9. 后续建议

如果继续演进 Web 端，建议优先做：

- 页面组件化
- 模块拆分
- 更稳定的二维码生成方案
- 视项目复杂度决定是否迁移到 Vue 或 React
