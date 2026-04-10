# 微信小程序端说明

## 1. 模块定位

本目录是访客预约系统的微信小程序端原型，面向访客使用，负责承接“进入首页 -> 提交预约 -> 查询进度 -> 查看电子凭证”这一条主流程。

当前小程序端已经具备基础闭环，适合本地联调、课程展示和后续页面重构。

## 2. 当前目录结构

```text
miniprogram/
├─ assets/
├─ components/
├─ pages/
│  ├─ home/
│  ├─ apply/
│  ├─ result/
│  ├─ query/
│  └─ pass/
├─ services/
├─ utils/
├─ app.js
├─ app.json
├─ app.wxss
├─ project.config.json
└─ sitemap.json
```

## 3. 页面职责

- `pages/home/`
  小程序首页，作为访客统一入口，提供“我要预约”和“查询进度”两个主动作，并展示最近一次查询手机号的快捷入口。
- `pages/apply/`
  预约申请页，填写访客姓名、手机号、来访事由、受访人和预约时间。
- `pages/result/`
  提交成功页，展示申请编号和入场码，并提供跳转到凭证页、查询页和首页的入口。
- `pages/query/`
  状态查询页，按手机号查询最近预约，展示审批状态、审批备注、审批人、审批时间、签到时间等信息。
- `pages/pass/`
  电子凭证页，展示预约详情、状态说明、入场码、二维码和核验内容。

## 4. 核心文件职责

- [services/api.js](/d:/projects/my_fourth_app/visitor_system/frontend/miniprogram/services/api.js)
  小程序请求层封装，统一调用后端接口。
- [utils/format.js](/d:/projects/my_fourth_app/visitor_system/frontend/miniprogram/utils/format.js)
  状态文案、状态色和时间格式化工具。
- [utils/storage.js](/d:/projects/my_fourth_app/visitor_system/frontend/miniprogram/utils/storage.js)
  缓存最近一次使用的手机号，提升首页、预约页、查询页和凭证页之间的连续性。
- `components/`
  预留给后续抽离的通用卡片、状态标签、按钮区等复用组件。
- [app.json](/d:/projects/my_fourth_app/visitor_system/frontend/miniprogram/app.json)
  小程序页面注册与全局配置。

## 5. 当前已实现能力

### 首页

- 提供“我要预约”和“查询进度”主入口
- 展示最近一次查询手机号
- 支持从首页一键继续查询进度

### 预约申请

- 填写访客姓名、手机号、来访事由、受访人、预约时间
- 调用 `POST /api/v1/apply` 提交预约
- 提交成功后跳转结果页
- 自动记住最近一次使用的手机号

### 结果页

- 展示申请编号和入场码
- 支持复制入场码
- 支持跳转到电子凭证页
- 支持跳转到状态查询页
- 支持返回首页

### 查询页

- 调用 `GET /api/v1/query/{phone}` 查询最近预约
- 展示当前状态、审批备注、审批人、审批时间、签到时间
- 支持复制入场码
- 支持跳转到电子凭证页
- 支持返回预约页和首页
- 支持下拉刷新
- 支持自动带入最近一次查询手机号

### 电子凭证页

- 展示预约详情
- 展示状态说明和状态色
- 展示入场码
- 展示核验 JSON 内容
- 支持复制入场码
- 支持复制核验内容
- 审批通过后展示二维码
- 支持二维码预览
- 支持返回查询页和首页
- 支持下拉刷新

## 6. 当前依赖接口

- `POST /api/v1/apply`
- `GET /api/v1/query/{phone}`

如果后续要继续扩展门岗小程序或移动签到端，还可以继续接入：

- `POST /api/v1/admin/inspect`
- `POST /api/v1/admin/check-in`

## 7. 使用方式

使用微信开发者工具打开：

- [miniprogram](/d:/projects/my_fourth_app/visitor_system/frontend/miniprogram)

然后确认后端服务已经启动，并且小程序开发环境能够访问对应 API 地址。

## 8. 当前适合的下一步

如果继续完善小程序端，建议优先做：

- 统一页面视觉风格
- 优化日期时间选择体验
- 抽离复用组件
- 收紧错误提示和空状态设计
- 优化二维码生成与缓存策略
- 结合微信能力进一步优化手机号与身份采集
