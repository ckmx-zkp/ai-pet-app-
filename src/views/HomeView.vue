<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import http from '../api/http'
import type { Device, PersonaProfile } from '../api/types'
import { useDeviceStore } from '../stores/devices'

const devices = useDeviceStore()
const loading = ref(false)
const errorMsg = ref('')
const persona = ref<PersonaProfile | null>(null)
const personaLoading = ref(false)
const personaError = ref('')
const activeDevice = computed(() => devices.activeDevice)
// 设备行内改名/解绑状态
const renamingId = ref<number | null>(null)
const renameName = ref('')
const renameSaving = ref(false)
const deviceActionError = ref('')

const zodiacLabels: Record<string, string> = {
  aries: '白羊座', taurus: '金牛座', gemini: '双子座', cancer: '巨蟹座',
  leo: '狮子座', virgo: '处女座', libra: '天秤座', scorpio: '天蝎座',
  sagittarius: '射手座', capricorn: '摩羯座', aquarius: '水瓶座', pisces: '双鱼座'
}

const personaSummary = computed(() => {
  if (!persona.value) return null
  const identity = persona.value.dossier?.identity?.trim() || ''
  const relationship = persona.value.dossier?.relationship?.trim() || ''
  return {
    sunSign: persona.value.sun_sign ? (zodiacLabels[persona.value.sun_sign] ?? persona.value.sun_sign) : '未设置星座',
    mbti: persona.value.mbti || '未设置 MBTI',
    kbVersion: persona.value.kb_version === null ? '未关联' : `v${persona.value.kb_version}`,
    followLatest: persona.value.follow_latest ? '跟随最新知识库' : '已钉扎当前版本',
    identity,
    relationship
  }
})

function formatLastSeen(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无活跃记录'
}

async function loadDevices() {
  loading.value = true
  errorMsg.value = ''
  try {
    await devices.fetchDevices()
    await loadPersona()
  } catch {
    errorMsg.value = '加载设备失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadPersona() {
  const deviceId = activeDevice.value?.id
  persona.value = null
  personaError.value = ''
  if (!deviceId) return

  personaLoading.value = true
  try {
    const { data } = await http.get<PersonaProfile>(`/devices/${deviceId}/persona`)
    // 请求返回时设备可能已切换，不能用旧响应覆盖新设备的信息。
    if (activeDevice.value?.id === deviceId) persona.value = data
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      personaError.value = '人设摘要加载失败，请稍后重试'
    }
  } finally {
    personaLoading.value = false
  }
}

async function selectDevice(deviceId: number) {
  devices.setActiveDevice(deviceId)
  await loadPersona()
}

function startRename(device: Device) {
  deviceActionError.value = ''
  renamingId.value = device.id
  renameName.value = device.name ?? ''
}

function cancelRename() {
  renamingId.value = null
  renameName.value = ''
}

// 行内改名：PATCH /devices/{id}；404=设备不存在或已解绑，422=名称不合法（契约：1–128 字）
async function submitRename(deviceId: number) {
  const name = renameName.value.trim()
  if (!name || name.length > 128) {
    deviceActionError.value = '名称需为 1–128 个字符'
    return
  }
  renameSaving.value = true
  deviceActionError.value = ''
  try {
    await devices.renameDevice(deviceId, name)
    cancelRename()
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      deviceActionError.value = '设备不存在或已解绑，请刷新列表'
    } else if (axios.isAxiosError(error) && error.response?.status === 422) {
      deviceActionError.value = '名称不合法，需为 1–128 个字符'
    } else {
      deviceActionError.value = '改名失败，请稍后重试'
    }
  } finally {
    renameSaving.value = false
  }
}

// 解绑：DELETE /devices/{id}，二次确认；解绑仅解除归属，历史保留、设备可重绑
async function unbindDevice(device: Device) {
  const label = device.name || device.device_uid
  if (!window.confirm(`确认解绑「${label}」吗？解绑仅解除归属，历史数据保留，设备可重新绑定。`)) return
  deviceActionError.value = ''
  try {
    await devices.removeDevice(device.id)
    if (renamingId.value === device.id) cancelRename()
    // 当前设备可能已切换或清空，刷新人设摘要
    await loadPersona()
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      deviceActionError.value = '设备不存在或已解绑，请刷新列表'
    } else {
      deviceActionError.value = '解绑失败，请稍后重试'
    }
  }
}

onMounted(loadDevices)
</script>

<template>
  <div class="page">
    <h1 class="page-title">我的宠物</h1>

    <div v-if="activeDevice" class="card pet-card">
      <div class="pet-avatar placeholder-block">宠物形象占位</div>
      <div class="pet-info">
        <p class="pet-name">{{ activeDevice.name || activeDevice.device_uid }}</p>
        <p class="muted">在线状态：{{ activeDevice.online ? '在线' : '离线' }}</p>
        <p class="muted">最后活跃：{{ formatLastSeen(activeDevice.last_seen_at) }}</p>
        <p class="muted">固件版本：{{ activeDevice.firmware_version || '未上报' }}</p>
      </div>
    </div>
    <div v-else class="placeholder-block empty-state">
      {{ loading ? '正在加载设备…' : '还没有绑定设备，先添加你的 AI Pet 吧。' }}
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <section v-if="activeDevice" class="card persona-summary" aria-label="当前设备人设摘要">
      <div class="section-heading">
        <h2>我的星仔</h2>
        <RouterLink :to="{ name: 'star' }">编辑档案</RouterLink>
      </div>
      <template v-if="personaLoading">
        <p class="muted">正在加载人设摘要…</p>
      </template>
      <template v-else-if="personaSummary">
        <p><strong>{{ personaSummary.sunSign }}</strong> · <strong>{{ personaSummary.mbti }}</strong></p>
        <p v-if="personaSummary.identity">{{ personaSummary.identity }}</p>
        <p v-if="personaSummary.relationship" class="muted">{{ personaSummary.relationship }}</p>
        <p class="muted">知识库：{{ personaSummary.kbVersion }} · {{ personaSummary.followLatest }}</p>
      </template>
      <template v-else>
        <p class="muted">{{ personaError || '还没有设置宠物性格，先为星仔选一个性格吧。' }}</p>
      </template>
    </section>

    <div v-if="devices.devices.length" class="card device-list">
      <div class="section-heading">
        <h2>我的设备</h2>
        <button class="refresh-button" type="button" :disabled="loading" @click="loadDevices">刷新</button>
      </div>
      <div v-for="device in devices.devices" :key="device.id" class="device-row">
        <template v-if="renamingId === device.id">
          <input
            v-model="renameName"
            class="input rename-input"
            type="text"
            maxlength="128"
            placeholder="输入新名称（1–128 字）"
            @keyup.enter="submitRename(device.id)"
          />
          <button class="row-action" type="button" :disabled="renameSaving" @click="submitRename(device.id)">
            {{ renameSaving ? '保存中…' : '保存' }}
          </button>
          <button class="row-action" type="button" :disabled="renameSaving" @click="cancelRename">取消</button>
        </template>
        <template v-else>
          <button
            class="device-item"
            :class="{ active: device.id === devices.activeDeviceId }"
            type="button"
            @click="selectDevice(device.id)"
          >
            <span>{{ device.name || device.device_uid }}</span>
            <span class="muted">{{ device.online ? '在线' : '离线' }}</span>
          </button>
          <button class="row-action" type="button" @click="startRename(device)">改名</button>
          <button class="row-action danger" type="button" @click="unbindDevice(device)">解绑</button>
        </template>
      </div>
      <p v-if="deviceActionError" class="error-msg">{{ deviceActionError }}</p>
    </div>

    <!-- 功能入口 -->
    <div class="entry-grid">
      <RouterLink class="btn-primary entry" :to="{ name: 'bind' }">绑定设备</RouterLink>
      <RouterLink
        class="btn-ghost entry"
        :to="activeDevice ? { name: 'persona', query: { deviceId: activeDevice.id } } : { name: 'bind' }"
      >
        {{ activeDevice ? '宠物性格' : '先绑定设备' }}
      </RouterLink>
      <RouterLink class="btn-ghost entry" :to="{ name: 'owner' }">用户性格</RouterLink>
      <RouterLink class="btn-ghost entry" :to="activeDevice ? { name: 'star' } : { name: 'bind' }">
        我的星仔
      </RouterLink>
      <RouterLink class="btn-ghost entry" :to="{ name: 'daily' }">日运/小记</RouterLink>
      <RouterLink class="btn-ghost entry" :to="{ name: 'tests' }">趣味测试</RouterLink>
      <RouterLink class="btn-ghost entry" :to="{ name: 'peripheral' }">外设状态</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.pet-card {
  display: flex;
  gap: 14px;
  align-items: center;
}

.pet-avatar {
  width: 96px;
  height: 96px;
  flex: none;
  min-height: 0;
  padding: 8px;
}

.pet-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pet-info p {
  margin: 0;
}

.pet-name {
  font-size: 16px;
  font-weight: 600;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.entry {
  text-align: center;
  text-decoration: none;
}

.empty-state {
  min-height: 150px;
}

.error-msg {
  margin: 0;
  color: #d63031;
  font-size: 13px;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.persona-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.persona-summary p {
  margin: 0;
}

.persona-summary a {
  color: var(--color-primary);
  font-size: 14px;
  text-decoration: none;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-heading h2 {
  margin: 0;
  font-size: 16px;
}

.refresh-button {
  border: 0;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.device-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.device-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-row .device-item {
  flex: 1;
  min-width: 0;
}

.rename-input {
  flex: 1;
  min-width: 0;
}

.row-action {
  flex: none;
  border: 0;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 13px;
  padding: 4px;
}

.row-action.danger {
  color: #d63031;
}
</style>
