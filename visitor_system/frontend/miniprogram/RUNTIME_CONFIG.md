# 小程序 HTTPS 地址方案

这套配置现在固定为三层：

- `develop`
  用于本机开发者工具联调，默认走 `http://127.0.0.1:8012`
- `trial`
  用于微信预览 / 试运行，必须使用真实 `https://` API 域名
- `release`
  用于正式发布，必须使用真实 `https://` API 域名

## 1. 当前配置入口

- 基础配置：
  [config/runtime.js](config/runtime.js)
- 私有覆盖模板：
  [config/runtime.private.example.js](config/runtime.private.example.js)

## 2. 推荐做法

复制一份私有配置文件：

```bash
cd visitor_system/frontend/miniprogram/config
copy runtime.private.example.js runtime.private.js
```

然后只改 `runtime.private.js`，不要直接改模板文件。

这个私有文件已经加入忽略列表：

- [.gitignore](.gitignore)

## 3. 推荐域名规划

如果你有测试环境和正式环境：

- `trial` -> `https://api-staging.your-domain.com`
- `release` -> `https://api.your-domain.com`

如果你暂时只有一套公网后端：

- `trial` -> `https://api.your-domain.com`
- `release` -> `https://api.your-domain.com`

## 4. 现在加上的保护

当前运行时会直接拦住以下错误配置：

- `trial` / `release` 没填 `apiBaseUrl`
- `trial` / `release` 使用 `http://`
- `trial` / `release` 使用 `127.0.0.1` 或 `localhost`

也就是说，后面你在微信预览或发布前，如果地址没配对，会先在小程序运行时得到明确错误，而不是静默打错请求。
