<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useDeviceStore } from '../stores/devices'
import { API_BASE } from '../api/http'
import http from '../api/http'
import type { ExportBundle } from '../api/types'

// P8 我的：账号 + 当前设备数据导出（E8 同步 JSON）+ 退出
const router = useRouter()
const auth = useAuthStore()
const devices = useDeviceStore()
const loadError = ref('')
const exporting = ref(false)
const exportError = ref('')
const bundle = ref<ExportBundle | null>(null)
const activeDevice = computed(() => devices.activeDevice)

const exportSummary = computed(() => {
  if (!bundle.value) return null
  const persona = bundle.value.persona
  return {
    at: new Date(bundle.value.exported_at).toLocaleString('zh-CN', { hour12: false }),
    deviceName: bundle.value.device.name || `设备 ${bundle.value.device.id}`,
    persona: persona ? `${persona.sun_sign || '未设星座'} · ${persona.mbti || '未设 MBTI'}` : '未配置人设',
    bazi: bundle.value.bazi_recorded ? '已录入（不含生辰原文）' : '未录入',
    memories: bundle.value.memories.length,
    messages: bundle.value.messages.length,
    analyses: bundle.value.analyses.length,
    daily: bundle.value.daily_contents.length
  }
})

onMounted(async () => {
  try {
    await auth.fetchMe()
    if (!devices.devices.length) await devices.fetchDevices()
  } catch {
    loadError.value = '获取用户信息失败（401 会自动回登录页）'
  }
})

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

async function exportData() {
  if (!activeDevice.value) return
  if (!window.confirm(`确认导出「${activeDevice.value.name || activeDevice.value.device_uid}」的可见数据吗？将生成一份 JSON，不含设备 MAC 和八字生辰原文。`)) return
  exporting.value = true
  exportError.value = ''
  try {
    const { data } = await http.post<ExportBundle>(`/devices/${activeDevice.value.id}/export`, undefined, { timeout: 30000 })
    bundle.value = data
  } catch (error) {
    bundle.value = null
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      exportError.value = '设备不存在或已解绑，请回首页刷新后再试'
    } else {
      exportError.value = '导出失败，请稍后重试'
    }
  } finally {
    exporting.value = false
  }
}

function downloadBundle() {
  if (!bundle.value) return
  const blob = new Blob([JSON.stringify(bundle.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const day = bundle.value.exported_at.slice(0, 10)
  link.href = url
  link.download = `ai-pet-export-${bundle.value.device.id}-${day}.json`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">我的</h1>

    <div class="card">
      <h2 class="section-title">账号</h2>
      <template v-if="auth.user">
        <p>账号：{{ auth.user.login_name }}</p>
        <p class="muted">用户 ID：{{ auth.user.id }}</p>
      </template>
      <p v-else class="muted">{{ loadError || '加载中…' }}</p>
    </div>

    <div class="card export-card">
      <h2 class="section-title">导出我的数据</h2>
      <p v-if="!activeDevice" class="muted">请先在首页选择已绑定设备，再导出该设备的可见数据。</p>
      <template v-else>
        <p class="muted">当前设备：{{ activeDevice.name || activeDevice.device_uid }}</p>
        <p class="muted">导出为 JSON 包：脱敏消息、已确认记忆、人设摘要与小记。不含 MAC 和八字生辰。</p>
        <button class="btn-primary" type="button" :disabled="exporting" @click="exportData">
          {{ exporting ? '导出中…' : '导出当前设备' }}
        </button>
        <p v-if="exportError" class="error-msg">{{ exportError }}</p>
        <template v-if="exportSummary">
          <p>导出时间：{{ exportSummary.at }}</p>
          <p>设备：{{ exportSummary.deviceName }}</p>
          <p>人设：{{ exportSummary.persona }}</p>
          <p>八字：{{ exportSummary.bazi }}</p>
          <p>记忆 {{ exportSummary.memories }} 条 · 消息 {{ exportSummary.messages }} 条 · 分析 {{ exportSummary.analyses }} 条 · 当日内容 {{ exportSummary.daily }} 条</p>
          <button class="btn-ghost" type="button" @click="downloadBundle">下载 JSON</button>
        </template>
      </template>
    </div>

    <div class="card">
      <h2 class="section-title">设置</h2>
      <p class="muted">当前 API 环境：<code>{{ API_BASE }}</code></p>
    </div>

    <button class="btn-ghost logout-btn" type="button" @click="logout">退出登录</button>
  </div>
</template>

<style scoped>
.section-title {
  margin: 0 0 10px;
  font-size: 16px;
}

.card p {
  margin: 6px 0;
}

.card code {
  background: var(--color-primary-light);
  border-radius: 4px;
  padding: 1px 4px;
  word-break: break-all;
}

.export-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.error-msg {
  margin: 0;
  color: #d63031;
  font-size: 13px;
}

.logout-btn {
  color: #d63031;
  border-color: #d63031;
}
</style>
