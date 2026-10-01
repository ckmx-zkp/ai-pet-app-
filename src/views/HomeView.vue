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
    sunSign: persona.value.sun_sign ? (zodiacLabels[persona.value.sun_sign] ?? persona.value.sun_sign) : '星光未定',
    mbti: persona.value.mbti || 'MBTI 待测',
    kbVersion: persona.value.kb_version === null ? '基础' : `v${persona.value.kb_version}`,
    followLatest: persona.value.follow_latest ? '跟随最新知识库' : '已钉扎版本',
    identity,
    relationship
  }
})

// 宠物灵动问候语
const petGreeting = computed(() => {
  if (!activeDevice.value?.online) return '正在打瞌睡，呼唤我随时醒来哦~'
  const quotes = [
    '今天也要和主人一起开开心心！✨',
    '刚才想到了一个好玩的话题呢~',
    '随时准备着倾听主人的悄悄话！💌',
    '眨了眨眼睛，今天主人真好看呀~'
  ]
  return quotes[Math.floor(Math.random() * quotes.length)]
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

async function unbindDevice(device: Device) {
  const label = device.name || device.device_uid
  if (!window.confirm(`确认解绑「${label}」吗？解绑仅解除归属，历史数据保留，设备可重新绑定。`)) return
  deviceActionError.value = ''
  try {
    await devices.removeDevice(device.id)
    if (renamingId.value === device.id) cancelRename()
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
  <div class="page home-page">
    <!-- 顶栏：问候与在线设备微芯片 -->
    <header class="home-header">
      <div>
        <h1 class="page-title">守护空间</h1>
        <p class="muted subtitle">陪伴你的每一刻微光</p>
      </div>
      <div v-if="activeDevice" class="device-badge">
        <span class="status-dot" :class="{ online: activeDevice.online }"></span>
        <span class="device-badge-name">{{ activeDevice.name || 'AI Pet' }}</span>
      </div>
    </header>

    <!-- 核心区：虚拟萌宠数字空间卡片 -->
    <section v-if="activeDevice" class="card pet-hero-card" aria-label="宠物形象与生活空间">
      <!-- 动态萌宠头顶心声气泡 -->
      <div class="speech-bubble">
        <span>{{ petGreeting }}</span>
        <div class="bubble-arrow"></div>
      </div>

      <!-- 动态拟态宠物形象 / 专属星座萌宠图 -->
      <div class="pet-visual-wrap">
        <div class="pet-glow-ring"></div>
        <img
          v-if="persona?.sun_sign"
          :src="`/zodiac/${persona.sun_sign}.jpg`"
          :alt="personaSummary?.sunSign"
          class="pet-zodiac-img"
        />
        <div v-else class="pet-avatar-svg">
          <!-- 默认萌宠表情 SVG -->
          <svg viewBox="0 0 120 120" width="108" height="108">
            <defs>
              <linearGradient id="petGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#a29bfe" />
                <stop offset="100%" stop-color="#6c5ce7" />
              </linearGradient>
              <linearGradient id="earGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff7675" />
                <stop offset="100%" stop-color="#fd79a8" />
              </linearGradient>
            </defs>
            <polygon points="28,45 15,15 48,28" fill="url(#petGrad)" rx="4" />
            <polygon points="28,40 18,20 44,30" fill="url(#earGrad)" opacity="0.6" />
            <polygon points="92,45 105,15 72,28" fill="url(#petGrad)" rx="4" />
            <polygon points="92,40 102,20 76,30" fill="url(#earGrad)" opacity="0.6" />
            <rect x="20" y="24" width="80" height="72" rx="36" fill="url(#petGrad)" />
            <circle cx="34" cy="68" r="8" fill="#ff7675" opacity="0.4" />
            <circle cx="86" cy="68" r="8" fill="#ff7675" opacity="0.4" />
            <g class="eyes-anim">
              <ellipse cx="44" cy="58" rx="6" ry="8" fill="#2d2a4a" />
              <circle cx="46" cy="55" r="2.5" fill="#ffffff" />
              <ellipse cx="76" cy="58" rx="6" ry="8" fill="#2d2a4a" />
              <circle cx="78" cy="55" r="2.5" fill="#ffffff" />
            </g>
            <polygon points="58,66 62,66 60,69" fill="#2d2a4a" />
            <path d="M54,72 Q60,76 66,72" fill="none" stroke="#2d2a4a" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <!-- 宠物名字与性格勋章 -->
      <div class="pet-meta">
        <h2 class="pet-name">{{ activeDevice.name || activeDevice.device_uid }}</h2>
        <div class="tag-row">
          <span class="pill-chip primary">
            {{ personaSummary?.sunSign || '星座探索中' }}
          </span>
          <span class="pill-chip accent">
            {{ personaSummary?.mbti || 'MBTI 待测' }}
          </span>
          <span class="pill-chip subtle">
            {{ activeDevice.online ? '🟢 在线' : '⚪ 待机中' }}
          </span>
        </div>
        <p v-if="personaSummary?.relationship" class="pet-relation-text">
          <span>🤝 与我的相处：</span><strong>{{ personaSummary.relationship }}</strong>
        </p>
      </div>

      <!-- 编辑档案快速直达 -->
      <RouterLink class="star-link-btn" :to="{ name: 'star' }">
        <span>星仔档案</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </RouterLink>
    </section>

    <!-- 空设备引导态 -->
    <div v-else class="card empty-card">
      <div class="empty-icon-wrap">✦</div>
      <p class="empty-title">{{ loading ? '正在寻找星仔…' : '还没有认领你的 AI 宠物' }}</p>
      <p class="muted">输入设备绑定码，一键开启数字生命陪伴</p>
      <RouterLink class="btn-primary" style="margin-top: 12px;" :to="{ name: 'bind' }">
        + 立即绑定设备
      </RouterLink>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <!-- 陪伴快捷交互岛 (2x2 Grid) -->
    <section class="hub-section">
      <div class="hub-grid">
        <RouterLink class="hub-tile" :to="{ name: 'daily' }">
          <div class="hub-icon-wrap icon-sun">☀️</div>
          <div class="hub-texts">
            <span class="hub-title">今日日签</span>
            <span class="hub-desc">每日星盘与开运点播</span>
          </div>
        </RouterLink>

        <RouterLink class="hub-tile" :to="{ name: 'memories' }">
          <div class="hub-icon-wrap icon-heart">💌</div>
          <div class="hub-texts">
            <span class="hub-title">回忆手账</span>
            <span class="hub-desc">点滴记忆与秘密审核</span>
          </div>
        </RouterLink>

        <RouterLink class="hub-tile" :to="{ name: 'tests' }">
          <div class="hub-icon-wrap icon-magic">🔮</div>
          <div class="hub-texts">
            <span class="hub-title">趣味测试</span>
            <span class="hub-desc">性格契合与星盘测试</span>
          </div>
        </RouterLink>

        <RouterLink
          class="hub-tile"
          :to="activeDevice ? { name: 'persona', query: { deviceId: activeDevice.id } } : { name: 'bind' }"
        >
          <div class="hub-icon-wrap icon-spark">🎨</div>
          <div class="hub-texts">
            <span class="hub-title">性格调优</span>
            <span class="hub-desc">定制口吻与人设规则</span>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- 设备管理与切换卡片 -->
    <section v-if="devices.devices.length" class="card device-list-card">
      <div class="section-heading">
        <h3 class="section-title">我的设备群 ({{ devices.devices.length }})</h3>
        <button class="refresh-button" type="button" :disabled="loading" @click="loadDevices">
          <span>刷新</span>
        </button>
      </div>

      <div class="devices-stack">
        <div v-for="device in devices.devices" :key="device.id" class="device-card-row">
          <template v-if="renamingId === device.id">
            <input
              v-model="renameName"
              class="input rename-input"
              type="text"
              maxlength="128"
              placeholder="输入新名称"
              @keyup.enter="submitRename(device.id)"
            />
            <button class="action-btn primary" type="button" :disabled="renameSaving" @click="submitRename(device.id)">
              {{ renameSaving ? '…' : '保存' }}
            </button>
            <button class="action-btn" type="button" :disabled="renameSaving" @click="cancelRename">取消</button>
          </template>
          <template v-else>
            <div
              class="device-chip-main"
              :class="{ active: device.id === devices.activeDeviceId }"
              @click="selectDevice(device.id)"
            >
              <div class="chip-avatar">🤖</div>
              <div class="chip-info">
                <span class="chip-title">{{ device.name || device.device_uid }}</span>
                <span class="chip-sub muted">
                  {{ device.online ? '在线 · 最近活跃' : '待机' }} {{ formatLastSeen(device.last_seen_at) }}
                </span>
              </div>
              <span v-if="device.id === devices.activeDeviceId" class="active-badge">当前陪伴</span>
            </div>
            <div class="chip-ops">
              <button class="action-link" type="button" @click="startRename(device)">改名</button>
              <button class="action-link danger" type="button" @click="unbindDevice(device)">解绑</button>
            </div>
          </template>
        </div>
      </div>
      <p v-if="deviceActionError" class="error-msg">{{ deviceActionError }}</p>

      <div class="card-footer-ops">
        <RouterLink class="footer-link" :to="{ name: 'bind' }">+ 添加新宠物</RouterLink>
        <RouterLink class="footer-link" :to="{ name: 'peripheral' }">查看外设状态 ›</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  gap: 16px;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 4px 2px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
}

.device-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  font-size: 13px;
  font-weight: 500;
}

.device-badge-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 核心 Hero 宠物空间卡片 */
.pet-hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 20px 20px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f9f8fe 100%);
  border: 1px solid rgba(217, 213, 240, 0.8);
}

/* 气泡心声 */
.speech-bubble {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 16px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  position: relative;
  margin-bottom: 12px;
  box-shadow: var(--shadow-sm);
  display: inline-block;
  animation: float-bubble 3s ease-in-out infinite;
}

.bubble-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--color-primary-light);
}

@keyframes float-bubble {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* 宠物形象与光环 */
.pet-visual-wrap {
  position: relative;
  width: 110px;
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 6px 0 14px;
}

.pet-glow-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.2) 0%, rgba(108, 92, 231, 0) 70%);
  animation: glow-pulse 3s infinite alternate;
}

@keyframes glow-pulse {
  0% { transform: scale(0.9); opacity: 0.5; }
  100% { transform: scale(1.15); opacity: 0.9; }
}

.pet-avatar-svg {
  position: relative;
  z-index: 1;
  animation: pet-breathe 4s ease-in-out infinite;
}

.pet-zodiac-img {
  width: 108px;
  height: 108px;
  border-radius: 24px;
  object-fit: cover;
  position: relative;
  z-index: 1;
  box-shadow: 0 8px 24px rgba(108, 92, 231, 0.28);
  border: 2px solid rgba(255, 255, 255, 0.95);
  animation: pet-breathe 4s ease-in-out infinite;
}

@keyframes pet-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.02); }
}

.eyes-anim {
  animation: blink 4s infinite;
  transform-origin: center;
}

@keyframes blink {
  0%, 96%, 100% { transform: scaleY(1); }
  98% { transform: scaleY(0.1); }
}

.pet-name {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}

.tag-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.pill-chip {
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
}

.pill-chip.primary {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.pill-chip.accent {
  background: #fff0f0;
  color: var(--color-accent);
}

.pill-chip.subtle {
  background: #f1f2f6;
  color: var(--color-text-dim);
}

.pet-relation-text {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--color-text-dim);
}

.star-link-btn {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: #fff;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.star-link-btn:hover {
  background: var(--color-primary-light);
  transform: translateY(-1px);
}

/* 陪伴快捷磁贴网格 */
.hub-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.hub-tile {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.hub-tile:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  border-color: var(--color-primary-hover);
}

.hub-tile:active {
  transform: scale(0.98);
}

.hub-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex: none;
}

.icon-sun { background: #fff9e6; }
.icon-heart { background: #ffeef2; }
.icon-magic { background: #f3f0ff; }
.icon-spark { background: #eafaf1; }

.hub-texts {
  display: flex;
  flex-direction: column;
}

.hub-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.hub-desc {
  font-size: 11px;
  color: var(--color-text-dim);
  margin-top: 2px;
}

/* 设备群卡片 */
.device-list-card {
  padding: 18px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.refresh-button {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.devices-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.device-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-chip-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.device-chip-main.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.chip-avatar {
  font-size: 22px;
}

.chip-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.chip-title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-sub {
  font-size: 11px;
}

.active-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
  background: #fff;
  padding: 2px 8px;
  border-radius: 10px;
}

.chip-ops {
  display: flex;
  gap: 4px;
}

.action-link {
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 6px;
}

.action-link.danger {
  color: #ff7675;
}

.rename-input {
  flex: 1;
}

.action-btn {
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

.action-btn.primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
}

.card-footer-ops {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
}

.footer-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary);
  text-decoration: none;
}

/* 空态卡片 */
.empty-card {
  padding: 36px 20px;
  text-align: center;
}

.empty-icon-wrap {
  width: 54px;
  height: 54px;
  margin: 0 auto 12px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px;
}

.error-msg {
  color: #ff7675;
  font-size: 13px;
  margin: 0;
}
</style>
