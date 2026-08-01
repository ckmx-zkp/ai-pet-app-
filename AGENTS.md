# AGENTS.md — ai-pet-app（用户端：手机 + 桌面）

> AI 会话进本仓前先读 `D:/Home_Work/AGENTS.md`，并按其中的安全规则检查/同步
> `D:/Home_Work/work_dashboard`，再读 `AI-Pet项目全景与进度.md`（第一信息源）和
> `AI-Pet协作看板.md`。看板有未提交改动时不得 pull，也不得混入自己的提交。

## 定位

AI Pet 的**用户端客户端**（手机 PWA + 桌面）：注册登录、绑设备/配网引导、人设（星座×MBTI）、历史与记忆管理、日运/小记、外设状态只读。只调 `ai-pet-backend` 的公开用户 API；**不直连设备 MQTT/语音，不做运营功能**（那是 ai-pet-admin）。

## 当前状态：Epic A + B1 + B2 + C1 + C2 + C3 + C4 + D1 + D2 已完成（2026-08-02）

Vue 3 + Vite + TS(strict) + Pinia + vue-router + axios + vite-plugin-pwa 已落地；
P0–P8 页面线框与路由全部挂通，B1 登录/注册已对接真实后端。C4 首页已展示当前设备的人设摘要（星座、MBTI、知识库版本与跟随策略，404 为空态）。B2.1 已按 backend E1.1
正式契约改为 `binding_id` 认领并部署至 `:8081`；**后续不得恢复或扩展 MAC 直绑**。
B2.2 已接入 `GET /devices`：首页展示设备摘要、支持当前设备选择并持久化，供人设等页面复用。
C1 已接入 E2 人设 GET/PUT：绑定成功后携带设备 ID 进入人设页，支持加载与保存星座、MBTI、忌口和钉扎。
C2 已接入 memories CRUD/审核：按当前设备搜索、手动新建、归档删除与候选通过/忽略。C3 已接入 E4 历史 GET/DELETE：按日浏览脱敏消息、分页加载与按天确认删除。D1 已接入
`GET /devices/{id}/peripheral`：展示最近一份眼睛状态快照、无上报空状态与手动刷新；不提供设备控制。
D2 已接入 `GET /devices/{id}/analyses?kind=daily_summary`：展示服务端小记并兼容等待生成空态。
技术选型已定（见 `docs/07`），后续可用 Capacitor 包壳。**明确放弃 Flutter / .NET MAUI / 原生双端**，不要再起选型讨论，除非有新材料先改 `docs/07`。

## 部署与跨仓硬边界

- 内测入口：`http://39.107.143.71:8081/`；前端必须使用同源 `VITE_API_BASE=/api`，不得写死管理台 `:8080`。
- 8081 Nginx 将 `/api/` 反代到 backend `127.0.0.1:8010`；当前为 HTTP 内测，正式发布仍需域名和 HTTPS。
- app 仅调用 backend 公开用户 API。admin 不得调用用户 `/devices/bind`，也不得占用 `devices.user_id`；管理端资产接口由 backend E1.1 后续提供。

## 常用命令

- `npm install` 安装依赖；`npm run dev` 本地开发
- `npm run build` 构建（内含 vue-tsc strict 类型检查）；`npm run preview` 预览产物
- `npm run typecheck` 仅类型检查

## 必读文档（docs/，按序）

- `docs/00`：文档索引与协作边界（本仓可做/禁做清单）
- `docs/06`：开发任务清单（Epic A–F，backlog 真源）
- `docs/03`：信息架构与页面规格；`docs/05`：对接 API 与数据流
- 接口契约真源：`ai-pet-backend/docs/06-HTTP-API规范.md`

## 开工前提

开发前确认 backend 用户 API 的**已部署**状态（看总看板“集成点状态”与 backend 进度摘要，不能只看本地代码）；auth、E1.1 devices、E2 persona、E4 messages、memories、analyses、peripheral 已部署。`/devices/{id}/export` 与 persona questionnaire 仍为 501；E2 的 12 星座与 16 MBTI 种子已发布。

## 约定（来自 README，AI 会话必须遵守）

- TS strict；中文注释与文档。
- **先改 docs 再实现，实现后回写 docs**（勾选 `docs/06` 任务项）。
- 小步提交：一个页面/一个端点一个会话；最简单实现优先，不做 speculative 抽象。
- AI 写完自测通过（构建 + 类型检查 + 页面手测）再进下一功能。
- 实际命令见上方「常用命令」节（dev/build/preview/typecheck）。

## 收工义务

完成任务后更新 `D:/Home_Work/work_dashboard/AI-Pet协作看板.md` 的"ai-pet-app"相关状态与进度日志。
