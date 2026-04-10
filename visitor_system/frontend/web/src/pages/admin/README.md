# Web 管理端页面骨架

本目录用于承接 Web 管理后台未来的模块拆分。

建议拆分方向：

- `dashboard.js`
  仪表盘、统计卡片、今日概览
- `pending.js`
  待审批列表与审批动作
- `onsite.js`
  现场签到、扫码、过期操作
- `history.js`
  历史记录与分页筛选
- `logs.js`
  系统日志筛选与展示
- `accounts.js`
  管理员账号、改密、启用禁用、新增账号

当前这些文件是占位骨架，后续可逐步把 [main.js](/d:/projects/my_fourth_app/visitor_system/frontend/web/src/main.js) 的逻辑迁入。
