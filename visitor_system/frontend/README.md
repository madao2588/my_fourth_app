# 访客系统前端说明

## 1. 前端定位

本项目的前端主目标已经明确为：

- 微信小程序：面向访客预约、查询、凭证展示
- Web：同时承接访客备用入口和管理员后台

也就是说，这个项目当前不是“通用 App 优先”的路线，而是“微信小程序 + 网页优先”的业务方案。

## 2. 当前目录结构

```text
frontend/
├─ miniprogram/
├─ web/
├─ shared/
├─ ARCHITECTURE.md
└─ README.md
```

各目录职责如下：

- `miniprogram/`
  微信小程序原型，服务访客端主流程
- `web/`
  Web 访客页和管理员后台
- `shared/`
  前后端共享接口约定、通用文档和联调资料
- `ARCHITECTURE.md`
  前端后续模块拆分和骨架规划说明

## 3. 当前前端能力

### 微信小程序

当前已具备：

- 预约申请页
- 提交结果页
- 手机号查询页
- 电子凭证页
- 状态说明与状态色
- 复制入场码
- 复制核验内容
- 审批通过后的二维码展示
- 下拉刷新

### Web

当前已具备：

- 首页入口
- 访客页
- 管理员页
- 访客预约表单
- 手机号查询
- 电子凭证展示
- 管理员登录
- 待审批列表
- 审批通过 / 拒绝
- 预约详情预览
- 入场码签到
- 手动过期
- 批量过期
- 统计卡片
- 今日看板
- 最近动态
- 历史记录筛选与服务端分页
- 日志筛选、加载更多、复制日志
- 摄像头扫码识别

## 4. Web 结构说明

当前 Web 原型主要入口如下：

- [index.html](/d:/projects/my_fourth_app/visitor_system/frontend/web/index.html)
- [visitor.html](/d:/projects/my_fourth_app/visitor_system/frontend/web/visitor.html)
- [admin.html](/d:/projects/my_fourth_app/visitor_system/frontend/web/admin.html)

核心脚本和样式：

- [main.js](/d:/projects/my_fourth_app/visitor_system/frontend/web/src/main.js)
- [api.js](/d:/projects/my_fourth_app/visitor_system/frontend/web/src/services/api.js)
- [main.css](/d:/projects/my_fourth_app/visitor_system/frontend/web/src/styles/main.css)
- [env.js](/d:/projects/my_fourth_app/visitor_system/frontend/web/src/config/env.js)

当前实现方式是轻量原型风格，优先把业务闭环跑通，因此还没有引入 Vue、React 或构建链路。

## 5. 小程序结构说明

当前小程序已包含以下页面：

- `pages/apply/`
  预约申请
- `pages/result/`
  提交结果
- `pages/query/`
  手机号查询
- `pages/pass/`
  电子凭证

当前还包含：

- `services/api.js`
  小程序接口请求层
- `utils/format.js`
  状态文案和时间格式工具

## 6. 联调方式

前端当前主要对接本项目后端 API。接口说明见：

- [api-contract.md](/d:/projects/my_fourth_app/visitor_system/frontend/shared/api/api-contract.md)

关键接口包括：

- `POST /api/v1/apply`

`appointment_time` ???????????? ISO 8601 ???????????? `2026-04-08T10:00:00+00:00`??

- `GET /api/v1/query/{phone}`
- `POST /api/v1/auth/login`
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

## 7. 当前设计思路

前端当前遵循的是“先闭环、再工程化”的策略：

1. 先把访客申请、审批、签到、过期、日志闭环跑通
2. 再补管理端控制台体验
3. 最后再考虑组件化、框架化和正式构建流程

这样做的好处是业务验证速度快，适合当前原型阶段。

## 8. 下一步建议

如果继续推进前端，建议按下面顺序做：

1. Web 页面进一步组件化
2. 小程序视觉和交互再统一一轮
3. 接入更稳定的二维码生成与扫码方案
4. 视项目体量决定是否迁移到 Vue 或 React

## 9. 说明

前端目录当前已经不是空骨架，而是可以直接配合后端演示核心流程的原型代码。后续继续开发时，建议优先保持接口字段稳定，再逐步收敛 UI 和工程结构。
