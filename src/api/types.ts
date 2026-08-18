/**
 * 后端 API 领域类型（契约真源：ai-pet-backend/docs/06-HTTP-API规范.md）
 * 字段已经 2026-08-01 线上真实响应核对。
 */

/** 当前登录用户（GET /auth/me）；注册响应同结构 */
export interface User {
  id: number
  login_name: string
  role?: 'user' | 'admin'
  status?: 'active' | 'disabled'
}

/** 设备（GET /devices、GET /devices/{id}） */
export interface Device {
  id: number
  /** 设备唯一标识（MAC），绑定时使用 */
  device_uid: string
  name: string | null
  /** 在线状态：E1 阶段按 online_at 阈值粗判，未接入 xiaozhi 前恒为 false */
  online: boolean
  firmware_version?: string
  /** 最后活跃时间（后端字段名为 last_seen_at） */
  last_seen_at?: string | null
  capabilities?: Record<string, unknown>
}

/** 设备改名请求（PATCH /devices/{id}）：1–128 字，后端去首尾空白；空串/超长返回 422 */
export interface DeviceRenamePayload {
  name: string
}

/** 登录响应（POST /auth/login，线上已核对） */
export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
}

/** 稳定角色档案（persona.dossier，六字段全部对用户可见可编辑） */
export interface PersonaDossier {
  identity: string
  background: string[]
  roles: string[]
  goals: string[]
  evolution_rules: string[]
  relationship: string
}

/** 人设读写响应（GET/PUT /devices/{id}/persona） */
export interface PersonaProfile {
  device_id: number
  sun_sign: string | null
  mbti: string | null
  overrides: Record<string, unknown>
  follow_latest: boolean
  kb_version: number | null
  dossier?: PersonaDossier
}

/** 人设保存请求。PUT 整对象覆盖，必须回传 overrides 其余键与 dossier。 */
export interface PersonaPayload {
  sun_sign: string
  mbti: string
  overrides: Record<string, unknown>
  follow_latest: boolean
  dossier: PersonaDossier
}

/** GET /devices/{id}/persona/questionnaire 题面（不含计分键） */
export interface QuestionnaireQuestion {
  id: string
  dimension: string
  prompt: string
  a: string
  b: string
}

export interface QuestionnaireOut {
  answers_required: number
  questions: QuestionnaireQuestion[]
}

/** POST /devices/{id}/export 同步 JSON 包 */
export interface ExportBundle {
  exported_at: string
  device: { id: number; name: string | null; device_uid_redacted: boolean }
  persona: {
    sun_sign: string | null
    mbti: string | null
    follow_latest: boolean
    kb_version: number | null
    overrides?: Record<string, unknown>
  } | null
  bazi_recorded: boolean
  memories: Array<{
    id: number
    title: string | null
    content: string
    status: string
    tags: string[]
  }>
  messages: Array<{
    id: number
    role: string
    content_redacted: string
    created_at: string | null
  }>
  analyses: Array<{
    id: number
    kind: string
    payload: Record<string, unknown>
    created_at: string | null
  }>
  daily_contents: Array<{
    date: string
    kind: string
    payload: Record<string, unknown>
  }>
}

/** 脱敏后的历史消息（GET /devices/{id}/messages） */
export interface ChatMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant' | 'system'
  content_redacted: string
  created_at: string
}

/** 外设最近一次上报的状态快照（GET /devices/{id}/peripheral） */
export interface PeripheralState {
  device_id: number
  eye_emotion: string | null
  eye_gaze: string | null
  eye_closed: boolean | null
  extra: Record<string, unknown>
  updated_at: string
}

export interface FunQuizListItem {
  id: number
  kind: string
  title: string
  subtitle: string
  source: string
  question_count: number
  quiz_date: string | null
}

export interface FunQuizDetail extends FunQuizListItem {
  questions: { id: string; prompt: string; options: { key: string; text: string }[] }[]
}

export interface ShareCard {
  title: string
  result: string
  summary: string
  tags: string[]
  footer: string
  theme: string
  save_hint: string
}

export interface QuizAttempt {
  id: number
  quiz_id: number
  quiz_title: string
  kind: string
  result: { title: string; summary: string; share_line?: string }
  share_card: ShareCard
}

export interface NatalBody {
  body: string
  sign: string
  sign_zh: string
  degree_in_sign: number
  blurb: string
}

export interface NatalChart {
  device_id: number
  has_time: boolean
  has_place: boolean
  has_rising: boolean
  headline: string
  bodies: Record<string, NatalBody>
  ascendant: NatalBody | null
  share_card: ShareCard
}

/** 用户可管理的设备记忆（GET /devices/{id}/memories） */
export interface MemoryItem {
  id: number
  device_id: number
  title: string | null
  content: string
  status: 'candidate' | 'active' | 'rejected' | 'archived' | string
  source: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface MemoryPayload {
  title?: string | null
  content: string
  tags: string[]
}

/** 运势维度（总述 + 事业/财运/学业/感情，E10 契约钉死 5 键） */
export interface FortuneDimensions {
  overall: string
  career: string
  wealth: string
  study: string
  love: string
}

/** 当日运势聚合（GET /devices/{id}/fortune/daily）；当日内容缺失时对应字段为 null 且 generating=true */
export interface DailyFortune {
  date: string
  sign: string
  sign_fortune: FortuneDimensions | null
  greeting: string | null
  bazi_fortune: FortuneDimensions | null
  generating: boolean
}

/** 主人八字（GET/PUT /devices/{id}/bazi，E10）；时辰/出生地/性别可空，响应 birth_time 序列化为 HH:MM:SS */
export interface BaziProfile {
  calendar_type: 'solar' | 'lunar'
  birth_date: string
  birth_time: string | null
  birth_place: string | null
  gender: string | null
}

/** 用户侧离线分析结果（GET /devices/{id}/analyses） */
export interface AnalysisResult {
  id: number
  kind: string
  payload: Record<string, unknown>
  created_at: string
}
