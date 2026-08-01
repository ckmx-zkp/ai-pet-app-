<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import http from '../api/http'
import type { PeripheralState } from '../api/types'
import { useDeviceStore } from '../stores/devices'

const devices = useDeviceStore()
const snapshot = ref<PeripheralState | null>(null)
const loading = ref(false)
const errorMsg = ref('')
const activeDeviceId = computed(() => devices.activeDeviceId)
const activeDevice = computed(() => devices.activeDevice)

const emotionLabels: Record<string, string> = {
  calm: '平静',
  happy: '开心',
  sad: '难过',
  surprised: '惊讶',
  angry: '生气',
  sleepy: '困倦'
}

const gazeLabels: Record<string, string> = {
  center: '看向前方',
  left: '看向左侧',
  right: '看向右侧',
  up: '看向上方',
  down: '看向下方'
}

const extraEntries = computed(() => {
  if (!snapshot.value) return []
  return Object.entries(snapshot.value.extra).filter(([, value]) =>
    ['string', 'number', 'boolean'].includes(typeof value)
  )
})

function formatValue(value: string | null, labels: Record<string, string>) {
  return value ? (labels[value] ?? value) : '暂未上报'
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function formatExtra(value: unknown) {
  return typeof value === 'boolean' ? (value ? '是' : '否') : String(value)
}

async function loadSnapshot(refreshDevices = false) {
  loading.value = true
  errorMsg.value = ''
  snapshot.value = null
  try {
    if (refreshDevices || !devices.devices.length) await devices.fetchDevices()
    if (!activeDeviceId.value) return
    const { data } = await http.get<PeripheralState>(`/devices/${activeDeviceId.value}/peripheral`)
    snapshot.value = data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return
    errorMsg.value = '加载外设状态失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadSnapshot())
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <h1 class="page-title">外设状态</h1>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadSnapshot(true)">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </div>

    <div v-if="!activeDeviceId && !loading" class="placeholder-block empty">
      请先在首页选择已绑定设备，再查看外设状态。
    </div>
    <template v-else-if="activeDeviceId">
      <p v-if="activeDevice" class="muted">当前设备：{{ activeDevice.name || activeDevice.device_uid }}</p>
      <p v-if="loading" class="muted">正在读取最近一次设备上报…</p>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <div v-if="!loading && !snapshot && !errorMsg" class="placeholder-block empty">
        暂未收到设备上报的外设状态。让宠物设备上线并互动后，再刷新看看。
      </div>
      <template v-if="snapshot">
        <section class="card state-card">
          <div class="state-row">
            <span class="muted">眼睛表情</span>
            <strong>{{ formatValue(snapshot.eye_emotion, emotionLabels) }}</strong>
          </div>
          <div class="state-row">
            <span class="muted">当前视线</span>
            <strong>{{ formatValue(snapshot.eye_gaze, gazeLabels) }}</strong>
          </div>
          <div class="state-row">
            <span class="muted">闭眼状态</span>
            <strong>{{ snapshot.eye_closed === null ? '暂未上报' : snapshot.eye_closed ? '正在闭眼' : '睁开' }}</strong>
          </div>
        </section>

        <section v-if="extraEntries.length" class="card state-card">
          <h2>其他状态</h2>
          <div v-for="[key, value] in extraEntries" :key="key" class="state-row">
            <span class="muted">{{ key }}</span>
            <strong>{{ formatExtra(value) }}</strong>
          </div>
        </section>
        <p class="muted updated-at">最近更新：{{ formatUpdatedAt(snapshot.updated_at) }}</p>
      </template>
    </template>
    <p class="muted">说明：表情与动作由宠物本体执行，此处仅展示最近一次上报状态。</p>
  </div>
</template>

<style scoped>
.empty {
  min-height: 200px;
}

.page-heading,
.state-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-heading .page-title {
  margin: 4px 0;
}

.refresh-button {
  border: 0;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 14px;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.state-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.state-card h2 {
  margin: 0;
  font-size: 16px;
}

.state-row strong {
  text-align: right;
  overflow-wrap: anywhere;
}

.updated-at,
.error-msg {
  margin: 0;
}

.error-msg {
  color: #d63031;
  font-size: 13px;
}
</style>
