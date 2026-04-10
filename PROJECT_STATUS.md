# 项目状态总览

## 当前定位

当前仓库已经完成“可演示原型”的主要闭环，不再是简单的项目骨架。

系统已具备：

- 访客预约申请
- 管理员登录与审批
- 访客状态查询
- 电子凭证与二维码展示
- 现场签到
- 手动过期与自动过期
- 管理后台统计、看板、历史记录、日志查询
- Web 与微信小程序两端原型
- Alembic 迁移、Docker 部署骨架、基础测试

## 当前完成度判断

### 后端

后端主干基本完成。

已经具备：

- 模块化结构
- 核心 API
- 管理员鉴权
- 账号管理
- 自动过期任务
- 日志体系
- 数据库迁移
- Docker / PostgreSQL 兼容
- 测试覆盖

### Web

Web 端已经足够支撑演示：

- 访客页可用
- 管理页可用
- 统计、日志、历史、扫码能力可用

### 微信小程序

小程序端已具备访客主流程：

- 预约
- 查询
- 凭证展示

## 当前仍属于原型阶段的部分

- Web 仍是原生静态页，尚未组件化
- 小程序视觉和交互仍可继续统一打磨
- 数据库默认仍是 SQLite
- 管理员角色模型还比较简单
- 生产环境能力仍缺 HTTPS、监控、备份等

## 推荐下一阶段

如果继续推进，建议优先级如下：

1. PostgreSQL 切换与生产配置拆分
2. 管理员角色与权限模型
3. Web 前端组件化或框架化
4. 小程序体验继续优化
5. 上线前 HTTPS、备份、监控完善

## 当前关键文档

- [README.md](/d:/projects/my_fourth_app/README.md)
- [DEMO.md](/d:/projects/my_fourth_app/DEMO.md)
- [DEPLOY_CHECKLIST.md](/d:/projects/my_fourth_app/DEPLOY_CHECKLIST.md)
- [backend/README.md](/d:/projects/my_fourth_app/visitor_system/backend/README.md)
- [frontend/README.md](/d:/projects/my_fourth_app/visitor_system/frontend/README.md)
- [api-contract.md](/d:/projects/my_fourth_app/visitor_system/frontend/shared/api/api-contract.md)
