<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import RelationshipForm from '../components/RelationshipForm.vue'
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
let loadVersion = 0

const zodiacLabels: Record<string, string> = {
  aries: '白羊座', taurus: '金牛座', gemini: '双子座', cancer: '巨蟹座',
  leo: '狮子座', virgo: '处女座', libra: '天秤座', scorpio: '天蝎座',
  sagittarius: '射手座', capricorn: '摩羯座', aquarius: '水瓶座', pisces: '双鱼座'
}

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
  const version = ++loadVersion
  loading.value = true
  loaded.value = null
  errorMsg.value = ''
  noPersona.value = false
  savedTip.value = ''
  try {
    if (!devices.devices.length) await devices.fetchDevices()
    if (version !== loadVersion) return
    if (!deviceId.value) return
    const { data } = await http.get<PersonaProfile>(`/devices/${deviceId.value}/persona`)
    if (version !== loadVersion) return
    loaded.value = data
    applyDossier(data)
  } catch (error) {
    if (version !== loadVersion) return
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
    if (version === loadVersion) loading.value = false
  }
}

async function save() {
  if (!deviceId.value || !loaded.value) return
  if (!loaded.value.sun_sign || !loaded.value.mbti) {
    errorMsg.value = '当前宠物性格缺少星座或 MBTI，请先到宠物性格页补全'
    return
  }
  saving.value = true
  const savingDevice = deviceId.value
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
    if (savingDevice !== deviceId.value) return
    loaded.value = data
    applyDossier(data)
    savedTip.value = '已保存，下次和宠物说话时生效'
  } catch (error) {
    if (savingDevice !== deviceId.value) return
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
watch(deviceId, load)
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
        还没有设置宠物性格，请先选择星座和 MBTI，再来填写角色档案。
        <RouterLink class="empty-link" :to="{ name: 'persona', query: { deviceId } }">去设置宠物性格</RouterLink>
      </div>
      <template v-else-if="loaded">
        <div class="card star-pet-badge-card">
          <img
            v-if="loaded.sun_sign"
            :src="`/zodiac/${loaded.sun_sign}.jpg`"
            class="star-badge-avatar"
            :alt="loaded.sun_sign"
          />
          <div class="star-badge-info">
            <span class="badge-title">
              {{ loaded.sun_sign ? zodiacLabels[loaded.sun_sign] || loaded.sun_sign : '未定星座' }} · {{ loaded.mbti || 'MBTI 待测' }}
            </span>
            <span class="muted font-12">当前星仔专属档案设定</span>
          </div>
        </div>
        <RelationshipForm :key="deviceId" :device-id="deviceId" />
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
      <p v-if="errorMsg && !loaded" class="error-msg" role="alert">{{ errorMsg }}</p>
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

.star-pet-badge-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
  border: 1px solid rgba(108, 92, 231, 0.25);
}
.star-badge-avatar {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.2);
  border: 2px solid #fff;
}
.star-badge-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.badge-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
}
.font-12 {
  font-size: 12px;
}

</style>
