<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import http from '../api/http'
import { buildPersonaPayload, linesToList, listToLines, normalizeDossier } from '../api/persona'
import type { PersonaDossier, PersonaProfile } from '../api/types'
import { useDeviceStore } from '../stores/devices'

// A1 我的星仔：dossier 六字段全部可见可编辑。PUT 必须回传现有星座/MBTI/overrides。
const devices = useDeviceStore()
const deviceId = computed(() => devices.activeDeviceId)
const loaded = ref<PersonaProfile | null>(null)
const identity = ref('')
const background = ref('')
const roles = ref('')
const goals = ref('')
const evolutionRules = ref('')
const relationship = ref('')
const loading = ref(false)
const saving = ref(false)
const noPersona = ref(false)
const errorMsg = ref('')
const savedTip = ref('')

function applyDossier(profile: PersonaProfile) {
  const dossier = normalizeDossier(profile.dossier)
  identity.value = dossier.identity
  background.value = listToLines(dossier.background)
  roles.value = listToLines(dossier.roles)
  goals.value = listToLines(dossier.goals)
  evolutionRules.value = listToLines(dossier.evolution_rules)
  relationship.value = dossier.relationship
}

function currentDossier(): PersonaDossier {
  return {
    identity: identity.value.trim(),
    background: linesToList(background.value),
    roles: linesToList(roles.value),
    goals: linesToList(goals.value),
    evolution_rules: linesToList(evolutionRules.value),
    relationship: relationship.value.trim()
  }
}

async function load() {
  if (!deviceId.value) return
  loading.value = true
  errorMsg.value = ''
  noPersona.value = false
  savedTip.value = ''
  try {
    if (!devices.devices.length) await devices.fetchDevices()
    if (!deviceId.value) return
    const { data } = await http.get<PersonaProfile>(`/devices/${deviceId.value}/persona`)
    loaded.value = data
    applyDossier(data)
  } catch (error) {
    loaded.value = null
    identity.value = ''
    background.value = ''
    roles.value = ''
    goals.value = ''
    evolutionRules.value = ''
    relationship.value = ''
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      noPersona.value = true
      return
    }
    errorMsg.value = '加载角色档案失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!deviceId.value || !loaded.value) return
  if (!loaded.value.sun_sign || !loaded.value.mbti) {
    errorMsg.value = '当前人设缺少星座或 MBTI，请先到人设页补全'
    return
  }
  saving.value = true
  errorMsg.value = ''
  savedTip.value = ''
  const payload = buildPersonaPayload(loaded.value, {
    sun_sign: loaded.value.sun_sign,
    mbti: loaded.value.mbti,
    follow_latest: loaded.value.follow_latest,
    dossier: currentDossier()
  })
  try {
    const { data } = await http.put<PersonaProfile>(`/devices/${deviceId.value}/persona`, payload)
    loaded.value = data
    applyDossier(data)
    savedTip.value = '已保存，下次和宠物说话时生效'
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      errorMsg.value = '档案内容超出限制（身份 1200 字、关系 600 字、列表各 8 条），请缩短后重试'
    } else {
      errorMsg.value = '保存失败，请稍后重试'
    }
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <h1 class="page-title">我的星仔</h1>
      <button class="text-button" type="button" :disabled="loading" @click="load">刷新</button>
    </div>
    <div v-if="!deviceId && !loading" class="placeholder-block empty">请先在首页选择已绑定设备，再编辑角色档案。</div>
    <template v-else-if="deviceId">
      <p v-if="loading" class="muted">正在加载角色档案…</p>
      <div v-else-if="noPersona" class="placeholder-block empty">
        还没有设置人设，请先选择星座和 MBTI，再来填写角色档案。
        <RouterLink class="empty-link" :to="{ name: 'persona', query: { deviceId } }">去设置人设</RouterLink>
      </div>
      <template v-else>
        <p class="muted">六项都会进入下次对话的人设。身份与关系是整段文字；其余每行一条，最多 8 条。</p>
        <div class="card field">
          <h2 class="section-title">身份</h2>
          <textarea v-model="identity" class="input" rows="3" maxlength="1200" placeholder="例如：温柔的陪伴型 AI 宠物" />
        </div>
        <div class="card field">
          <h2 class="section-title">背景</h2>
          <textarea v-model="background" class="input" rows="3" placeholder="每行一条，最多 8 条" />
        </div>
        <div class="card field">
          <h2 class="section-title">角色</h2>
          <textarea v-model="roles" class="input" rows="3" placeholder="每行一条，最多 8 条" />
        </div>
        <div class="card field">
          <h2 class="section-title">目标</h2>
          <textarea v-model="goals" class="input" rows="3" placeholder="每行一条，最多 8 条" />
        </div>
        <div class="card field">
          <h2 class="section-title">进化规则</h2>
          <textarea v-model="evolutionRules" class="input" rows="3" placeholder="每行一条，最多 8 条" />
        </div>
        <div class="card field">
          <h2 class="section-title">关系</h2>
          <textarea v-model="relationship" class="input" rows="3" maxlength="600" placeholder="和主人的关系，例如：把主人当家人，先接住情绪再给建议" />
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <button class="btn-primary" type="button" :disabled="loading || saving" @click="save">
          {{ saving ? '保存中…' : '保存档案' }}
        </button>
        <p v-if="savedTip" class="muted save-tip">{{ savedTip }}</p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-heading .page-title {
  margin: 4px 0;
}
.text-button {
  border: 0;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
}
.section-title {
  margin: 0 0 10px;
  font-size: 16px;
}
.field textarea {
  resize: vertical;
  font-family: inherit;
}
.empty {
  min-height: 160px;
  flex-direction: column;
  gap: 10px;
}
.empty-link {
  color: var(--color-primary);
  text-decoration: none;
}
.error-msg {
  margin: 0;
  color: #d63031;
  font-size: 13px;
}
.save-tip {
  text-align: center;
}
</style>
