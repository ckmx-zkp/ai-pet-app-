# ai-pet-app — 用户端（手机 App + 桌面）

> 职责：给**终端用户**用的跨端客户端——配网/绑设备、定星座×MBTI 人设、看历史与记忆、日运/小记、外设状态；桌面与手机共用业务能力。  
> **不是**运营/调试管理台（那是 `../ai-pet-admin`）。

## 与 ai-pet-admin 的分工

| | `ai-pet-app`（本仓） | `ai-pet-admin` |
|--|---------------------|----------------|
| 用户 | 宠物主人 / 内测体验用户 | 开发者 / 运营管理员 |
| 知识库发布 | ❌ 不暴露 | ✅ admin |
| 小智智控台 | ❌ 不链或极深隐藏 | ✅ 外链 |
| 体验重心 | 陪伴、人设、记忆、日运 | 资产、调试、KB 运营 |
| 平台 | iOS / Android / Windows / macOS（建议一套代码） | Web 浏览器 |

## 技术选型（已拍板 2026-07）

| 方案 | 说明 |
|------|------|
| **选定：Vue 3 + Vite + TS + PWA** | 一套代码覆盖手机/平板/桌面浏览器，可安装到主屏与桌面；V0.2 功能全部为 REST CRUD，无原生能力刚需 |
| 演进路径 | 纯 SPA → `vite-plugin-pwa`（可安装/离线缓存）→ 需要推送/上架时用 Capacitor 包壳，业务代码零重写 |
| **放弃**：Flutter / .NET MAUI / 原生双端 | 前期无开发人员，采用 AI 驱动开发（vibe coding）；Web 栈 AI 生成质量与试错循环最优，且与 ai-pet-admin 同栈复用心智 |

## AI 协作约定（vibe coding）

- TypeScript 开 strict；每个功能要求 AI 写完并自测通过（前端 build / 后端 pytest）再进下一个
- 小步提交：一个页面 / 一个端点一次会话
- 最简单实现优先，拒绝过度抽象
- 先改 docs 再实现，实现后回写 docs

后端一律走 `../ai-pet-backend` 的公开用户 API；**不直连**设备 MQTT（语音仍在硬件↔`xiaozhi-server`）。

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/00-文档索引与协作边界.md](./docs/00-文档索引与协作边界.md) | 与三仓/固件边界 |
| [docs/01-项目概述与用户场景.md](./docs/01-项目概述与用户场景.md) | 目标用户、JTBD |
| [docs/02-业务功能拆解与版本.md](./docs/02-业务功能拆解与版本.md) | 功能→版本 MoSCoW |
| [docs/03-信息架构与页面规格.md](./docs/03-信息架构与页面规格.md) | 手机/桌面 IA 与页面 |
| [docs/04-跨端体验与平台差异.md](./docs/04-跨端体验与平台差异.md) | App vs 桌面差异 |
| [docs/05-对接API与数据流.md](./docs/05-对接API与数据流.md) | API 映射、配网说明 |
| [docs/06-开发任务清单.md](./docs/06-开发任务清单.md) | backlog |
| [docs/07-技术选型分析与决策.md](./docs/07-技术选型分析与决策.md) | 五仓技术栈分析与 PWA 决策 |

## 建议开工顺序

1. 后端用户 API 就绪（登录/设备/人设/历史/记忆）  
2. 本仓先做「登录 + 设备 + 人设 + 记忆」手机竖屏  
3. 适配桌面宽屏布局  
4. 再做日运/小记、导出、多设备  

## 工程命令（Epic A 已建工程）

```bash
npm install        # 安装依赖
npm run dev        # 本地开发（Vite，默认 http://localhost:5173）
npm run build      # 构建（先 vue-tsc 类型检查，strict 不过则失败）
npm run preview    # 预览构建产物
npm run typecheck  # 仅类型检查
```

技术栈：Vue 3 + Vite + TypeScript（strict）+ Pinia + vue-router + axios + vite-plugin-pwa；
不引入 UI 组件库，原生 CSS 线框风格（主题色星云紫 `#6c5ce7`）。
后端地址由 `VITE_API_BASE` 配置（见 `.env.example`）。生产部署默认使用同源 `/api`，
由 `:8081` 的 Nginx 反代到 backend；本地直连后端时再通过 `.env.local` 覆盖。
