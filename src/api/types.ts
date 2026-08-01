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

/** 登录响应（POST /auth/login，线上已核对） */
export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
}

/** 人设读写响应（GET/PUT /devices/{id}/persona） */
export interface PersonaProfile {
  device_id: number
  sun_sign: string | null
  mbti: string | null
  overrides: Record<string, unknown>
  follow_latest: boolean
  kb_version: number | null
}

/** 人设保存请求 */
export interface PersonaPayload {
  sun_sign: string
  mbti: string
  overrides: { taboo: string[] }
  follow_latest: boolean
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

/** 用户侧离线分析结果（GET /devices/{id}/analyses） */
export interface AnalysisResult {
  id: number
  kind: string
  payload: Record<string, unknown>
  created_at: string
}
