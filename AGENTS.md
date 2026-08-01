# AGENTS.md — ai-pet-app（用户端：手机 + 桌面）

> AI 会话进本仓前**先拉取根协作文档**：`D:/Home_Work/work_dashboard/AI-Pet项目全景与进度.md`（第一信息源），
> 再读 `D:/Home_Work/AGENTS.md` 和 `D:/Home_Work/work_dashboard/AI-Pet协作看板.md`。

## 定位

AI Pet 的**用户端客户端**（手机 PWA + 桌面）：注册登录、绑设备/配网引导、人设（星座×MBTI）、历史与记忆管理、日运/小记、外设状态只读。只调 `ai-pet-backend` 的公开用户 API；**不直连设备 MQTT/语音，不做运营功能**（那是 ai-pet-admin）。

## 当前状态：Epic A 工程骨架已完成（2026-08）

Vue 3 + Vite + TS(strict) + Pinia + vue-router + axios + vite-plugin-pwa 已落地；
P0–P8 页面线框与路由全部挂通，B1 登录/注册已对接真实后端。
技术选型已定（见 `docs/07`），后续可用 Capacitor 包壳。**明确放弃 Flutter / .NET MAUI / 原生双端**，不要再起选型讨论，除非有新材料先改 `docs/07`。

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

Epic A（建工程）之前确认 backend 用户 API 可用状态（看总看板"集成点状态"与 backend 进度摘要）；auth 已上线，devices 已上线，persona/messages/memories 进度以看板为准。

## 约定（来自 README，AI 会话必须遵守）

- TS strict；中文注释与文档。
- **先改 docs 再实现，实现后回写 docs**（勾选 `docs/06` 任务项）。
- 小步提交：一个页面/一个端点一个会话；最简单实现优先，不做 speculative 抽象。
- AI 写完自测通过（构建 + 类型检查 + 页面手测）再进下一功能。
- 实际命令见上方「常用命令」节（dev/build/preview/typecheck）。

## 收工义务

完成任务后更新 `D:/Home_Work/work_dashboard/AI-Pet协作看板.md` 的"ai-pet-app"相关状态与进度日志。
