# 05 — 对接 API 与数据流

契约以 `ai-pet-backend/docs/06-HTTP-API规范.md` 为准（仅用**用户侧**路径，不用 `/admin/*`、少用 `/internal/*`）。

## 数据流

```mermaid
flowchart LR
    app["ai-pet-app\n手机/桌面"] -->|"HTTPS 用户 API"| api["ai-pet-backend"]
    toy["AI Pet 硬件"] -->|"MQTT/语音"| xz["xiaozhi-server"]
    xz -->|"旁路事件/拉 pack"| api
    app -.->|"不直连语音"| toy
```

## 页面 → API

| 页面 | API |
|------|-----|
| 登录注册 | `POST /auth/login` `POST /auth/register` |
| 设备 | `GET /devices` `POST /devices/bind` `GET /devices/{id}` |
| 人设 | `GET/PUT /devices/{id}/persona` |
| 历史 | `GET/DELETE /devices/{id}/messages` |
| 记忆 | `CRUD /devices/{id}/memories` + `approve` |
| 分析/小记 | `GET /devices/{id}/analyses?kind=` |
| 外设 | `GET /devices/{id}/peripheral` |
| 导出 | `POST /devices/{id}/export` |

### 当前设备选择（B2.2）

- 登录后首页调用 `GET /devices` 获取当前用户已认领的设备；只显示后端返回的数据，不查询 admin 资产接口。
- 用户可在首页切换当前设备，当前设备 ID 持久化在本机，用于人设页和后续历史、记忆等用户端页面。
- 设备详情摘要展示名称、在线状态、最近活跃和固件版本；没有设备时引导至绑定页。

## 配网与绑定（说明）

1. 用户按引导让设备上网（固件现有小智配网流程）。  
2. 设备连上 `xiaozhi-server` 后以 MAC/SN 作为内部 `device_uid` 上报 `devices/seen`。  
3. backend 首见设备生成不可猜测的 `binding_id`；App 扫码或手动输入该绑定标识，并调用 `POST /devices/bind` 认领。App 不得传 MAC 或后端自增 ID 认领设备。  
4. 人设写入 backend → 下次会话 xiaozhi 拉 `persona_pack`。  

### 手动绑定交互（E1.1 正式契约）

- 提交前去除输入首尾空白；请求体为 `{ "binding_id": "<扫码或设备标签提供的绑定码>" }`，携带当前登录用户的 Bearer Token。
- 成功（201）显示已绑定的设备标识，并提供返回首页的入口；404 提示绑定码不存在或已失效；409 提示已被其他用户认领；403 表示错误地使用了 admin 账号。
- 当前 app 的 MAC 直绑实现仅为 E1 过渡代码；backend E1.1 部署后必须同步迁移，不能将 MAC 视为用户绑定凭据。

### 人设交互（E2）

- 人设页必须带当前用户已认领设备的 `device_id`；绑定成功后由响应中的 `id` 跳转携带。未选择设备时不允许读写人设。
- `GET /devices/{id}/persona` 返回 404 表示尚未配置，页面保持空表单；其他错误显示加载失败。
- 保存请求为 `{ sun_sign, mbti, overrides: { taboo: string[] }, follow_latest }`。界面的“钉扎人设”与 `follow_latest` 语义相反：钉扎时传 `false`。
- 当前已发布的最小种子仅含双鱼及 INFP/ISFP；其它星座或 MBTI 由 backend 返回 422，待 KB 种子发布后可用。

### 历史交互（E4）

- 历史页使用当前选中设备的 `device_id` 请求 `GET /devices/{id}/messages?limit&offset`，仅展示 backend 已脱敏的 `content_redacted`，按本地日期分组。
- 首次加载 20 条，可继续加载下一页；无当前设备时引导用户先绑定或在首页选择设备。
- 删除以一天为最小确认单位，调用 `DELETE /devices/{id}/messages?from=<ISO>&to=<ISO>`；后端要求至少提供一个时间边界并写审计，前端不得发无条件删除请求。

App **不实现** OTA；OTA 属固件/小智服务。

## 环境配置

```text
VITE_API_BASE=/api
```

生产部署采用同源反代：用户端由 Nginx 的 `:8081` 提供静态文件，并将 `/api/`
代理至 backend `127.0.0.1:8010`。因此构建产物必须使用相对地址 `/api`，避免浏览器
跨端口访问管理台的 `:8080`。本地直连后端时可在 `.env.local` 覆盖
`VITE_API_BASE=http://<host>:<port>/api`。

认证契约：`POST /auth/register` 返回用户信息（201），不签发 Token；随后必须调用
`POST /auth/login`，读取 `access_token` 并以 `Authorization: Bearer <token>` 调用
`GET /auth/me`。

## 错误与空态

| 情况 | 处理 |
|------|------|
| 401 | 清 Token，回登录 |
| 设备离线 | 允许编辑人设/记忆，状态条提示离线 |
| 列表空 | 引导去绑定或先去和宠物聊天 |
