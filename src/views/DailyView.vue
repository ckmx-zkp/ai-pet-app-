<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import http from '../api/http'
import type { AnalysisResult } from '../api/types'
import { useDeviceStore } from '../stores/devices'

const devices = useDeviceStore()
const analyses = ref<AnalysisResult[]>([])
const loading = ref(false)
const errorMsg = ref('')
const activeDeviceId = computed(() => devices.activeDeviceId)
const activeDevice = computed(() => devices.activeDevice)

function textValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value : ''
}

function listValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
}

function isEmpty(result: AnalysisResult) {
  return result.payload.empty === true || !textValue(result.payload, 'summary')
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

async function load(refreshDevices = false) {
  loading.value = true
  errorMsg.value = ''
  try {
    if (refreshDevices || !devices.devices.length) await devices.fetchDevices()
    if (!activeDeviceId.value) return
    const { data } = await http.get<AnalysisResult[]>(`/devices/${activeDeviceId.value}/analyses`, {
      params: { kind: 'daily_summary', limit: 20, offset: 0 }
    })
    analyses.value = data
  } catch {
    errorMsg.value = '加载小记失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <div class="page">
    <div class="page-heading"><h1 class="page-title">日运 / 小记</h1><button class="text-button" type="button" :disabled="loading" @click="load(true)">{{ loading ? '刷新中…' : '刷新' }}</button></div>
    <div v-if="!activeDeviceId && !loading" class="placeholder-block empty">请先在首页选择已绑定设备，再查看小记。</div>
    <template v-else-if="activeDeviceId">
      <p v-if="activeDevice" class="muted">当前设备：{{ activeDevice.name || activeDevice.device_uid }}</p>
      <p v-if="loading" class="muted">正在读取服务端小结…</p><p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <div v-if="!loading && !analyses.length && !errorMsg" class="placeholder-block empty">暂时还没有小记。设备会话结束并完成服务端小结后，会出现在这里。</div>
      <article v-for="analysis in analyses" :key="analysis.id" class="card summary-card" :class="{ pending: isEmpty(analysis) }">
        <div class="summary-header"><h2>{{ isEmpty(analysis) ? '等待小结生成' : '本次小记' }}</h2><time class="muted">{{ formatDate(analysis.created_at) }}</time></div>
        <template v-if="!isEmpty(analysis)">
          <p class="summary">{{ textValue(analysis.payload, 'summary') }}</p>
          <div v-if="listValue(analysis.payload, 'topics').length" class="section"><span class="muted">聊到了</span><p class="chips"><span v-for="topic in listValue(analysis.payload, 'topics')" :key="topic">{{ topic }}</span></p></div>
          <p v-if="textValue(analysis.payload, 'user_mood')" class="section"><span class="muted">你的心情</span><strong>{{ textValue(analysis.payload, 'user_mood') }}</strong></p>
          <div v-if="listValue(analysis.payload, 'follow_up').length" class="section"><span class="muted">下次可以继续聊</span><ul><li v-for="item in listValue(analysis.payload, 'follow_up')" :key="item">{{ item }}</li></ul></div>
        </template>
        <p v-else class="muted">这次会话暂无可生成内容，等待下一次互动。</p>
      </article>
    </template>
    <p class="muted">说明：小记由服务端基于已脱敏的会话内容生成，App 不直接计算日运或星盘。</p>
  </div>
</template>

<style scoped>
.page-heading,.summary-header,.section{display:flex;align-items:center;justify-content:space-between;gap:12px}.page-heading .page-title{margin:4px 0}.text-button{border:0;background:none;color:var(--color-primary);cursor:pointer}.text-button:disabled{opacity:.5}.summary-card{display:flex;flex-direction:column;gap:12px}.summary-card h2{margin:0;font-size:16px}.summary-header time{font-size:12px;text-align:right}.summary{margin:0;line-height:1.65;white-space:pre-wrap}.section{align-items:flex-start}.section strong{text-align:right}.section ul{margin:0;padding-left:20px;line-height:1.7}.chips{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;margin:0}.chips span{background:var(--color-primary-light);color:var(--color-primary);border-radius:99px;padding:3px 8px;font-size:12px}.pending{border-style:dashed}.empty{min-height:180px}.error-msg{margin:0;color:#d63031;font-size:13px}
</style>
