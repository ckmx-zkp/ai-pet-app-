import type { PersonaDossier, PersonaPayload, PersonaProfile } from './types'

export function emptyDossier(): PersonaDossier {
  return {
    identity: '',
    background: [],
    roles: [],
    goals: [],
    evolution_rules: [],
    relationship: ''
  }
}

export function normalizeDossier(value: PersonaDossier | undefined | null): PersonaDossier {
  return {
    identity: value?.identity ?? '',
    background: Array.isArray(value?.background) ? value.background : [],
    roles: Array.isArray(value?.roles) ? value.roles : [],
    goals: Array.isArray(value?.goals) ? value.goals : [],
    evolution_rules: Array.isArray(value?.evolution_rules) ? value.evolution_rules : [],
    relationship: value?.relationship ?? ''
  }
}

/** 多行文本 → 至多 8 条，与 backend PersonaDossier list 上限一致 */
export function linesToList(text: string, max = 8): string[] {
  return text.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, max)
}

export function listToLines(items: string[] | undefined): string {
  return (items ?? []).join('\n')
}

/**
 * 组装 PUT /persona。后端整对象覆盖，忌口/档案各自保存时必须带回未改字段。
 */
export function buildPersonaPayload(
  base: PersonaProfile | null,
  patch: {
    sun_sign: string
    mbti: string
    taboo?: string[]
    follow_latest: boolean
    dossier?: PersonaDossier
  }
): PersonaPayload {
  const overrides: Record<string, unknown> = { ...(base?.overrides ?? {}) }
  if (patch.taboo) overrides.taboo = patch.taboo
  return {
    sun_sign: patch.sun_sign,
    mbti: patch.mbti,
    overrides,
    follow_latest: patch.follow_latest,
    dossier: patch.dossier ?? normalizeDossier(base?.dossier)
  }
}
