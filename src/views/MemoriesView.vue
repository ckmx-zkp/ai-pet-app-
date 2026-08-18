<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import http from '../api/http'
import type { AnalysisResult, MemoryItem, MemoryPayload } from '../api/types'
import { useDeviceStore } from '../stores/devices'

const PAGE_SIZE = 20
const devices = useDeviceStore()
const items = ref<MemoryItem[]>([])
const search = ref('')
const filterStatus = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const saving = ref(false)
const actionId = ref<number | null>(null)
const showCreate = ref(false)
const errorMsg = ref('')
const hasMore = ref(true)
const title = ref('')
const content = ref('')
const tags = ref('')
const activeDeviceId = computed(() => devices.activeDeviceId)

const profile = ref<AnalysisResult | null>(null)
const profileLoading = ref(false)
const profileError = ref('')

function textValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value : ''
}

function rememberedItems(payload: Record<string, unknown>) {
  const value = payload.remembered
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const row = item as Record<string, unknown>
    const title = typeof row.title === 'string' ? row.title : ''
    const summary = typeof row.summary === 'string' ? row.summary : ''
    const tags = Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()))
      : []
    if (!title && !summary) return []
    return [{ title: title || '未命名', summary, tags }]
  })
}

const profileImpact = computed(() => (profile.value ? textValue(profile.value.payload, 'companion_impact') : ''))
const profileRemembered = computed(() => (profile.value ? rememberedItems(profile.value.payload) : []))
const profileCount = computed(() => {
  const value = profile.value?.payload.memory_count
  return typeof value === 'number' ? value : profileRemembered.value.length
})

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function statusLabel(status: string) {
  return { active: '已保存', candidate: '待确认', rejected: '已忽略', archived: '已归档' }[status] ?? status
}

async function fetchMemories(offset = 0) {
  if (!activeDeviceId.value) return
  const { data } = await http.get<MemoryItem[]>(`/devices/${activeDeviceId.value}/memories`, {
    params: { q: search.value.trim() || undefined, status: filterStatus.value || undefined, limit: PAGE_SIZE, offset }
  })
  items.value = offset ? [...items.value, ...data] : data
  hasMore.value = data.length === PAGE_SIZE
}

async function loadProfile() {
  if (!activeDeviceId.value) return
  profileLoading.value = true
  profileError.value = ''
  try {
    const { data } = await http.get<AnalysisResult[]>(`/devices/${activeDeviceId.value}/analyses`, {
      params: { kind: 'memory_profile', limit: 1, offset: 0 }
    })
    profile.value = data[0] ?? null
  } catch {
    profileError.value = '加载记忆画像失败，请稍后重试'
  } finally {
    profileLoading.value = false
  }
}

async function load(refreshDevices = false) {
  loading.value = true
  errorMsg.value = ''
  try {
    if (refreshDevices || !devices.devices.length) await devices.fetchDevices()
    if (!activeDeviceId.value) return
    await Promise.all([fetchMemories(), loadProfile()])
  } catch {
    errorMsg.value = '加载记忆失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    await fetchMemories(items.value.length)
  } catch {
    errorMsg.value = '加载更多记忆失败，请稍后重试'
  } finally {
    loadingMore.value = false
  }
}

async function createMemory() {
  if (!activeDeviceId.value || !content.value.trim()) return
  saving.value = true
  errorMsg.value = ''
  const payload: MemoryPayload = {
    title: title.value.trim() || null,
    content: content.value.trim(),
    tags: tags.value.split(/[，,]/).map((item) => item.trim()).filter(Boolean).slice(0, 20)
  }
  try {
    await http.post(`/devices/${activeDeviceId.value}/memories`, payload)
    title.value = ''
    content.value = ''
    tags.value = ''
    showCreate.value = false
    await load()
  } catch {
    errorMsg.value = '保存记忆失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

async function review(item: MemoryItem, action: 'approve' | 'reject') {
  if (!activeDeviceId.value) return
  actionId.value = item.id
  errorMsg.value = ''
  try {
    await http.post(`/devices/${activeDeviceId.value}/memories/${item.id}/${action}`)
    await load()
  } catch (error) {
    errorMsg.value = axios.isAxiosError(error) && error.response?.status === 409
      ? '该记忆状态已变化，请刷新后重试'
      : '操作失败，请稍后重试'
  } finally {
    actionId.value = null
  }
}

async function archive(item: MemoryItem) {
  if (!activeDeviceId.value || !window.confirm(`确定归档「${item.title || '这条记忆'}」吗？`)) return
  actionId.value = item.id
  errorMsg.value = ''
  try {
    await http.delete(`/devices/${activeDeviceId.value}/memories/${item.id}`)
    await load()
  } catch {
    errorMsg.value = '归档记忆失败，请稍后重试'
  } finally {
    actionId.value = null
  }
}

onMounted(() => load())
</script>

<template>
  <div class="page">
    <div class="page-heading"><h1 class="page-title">记忆</h1><button class="text-button" type="button" :disabled="loading" @click="load(true)">刷新</button></div>
    <div v-if="!activeDeviceId && !loading" class="placeholder-block empty">请先在首页选择已绑定设备，再管理记忆。</div>
    <template v-else-if="activeDeviceId">
      <article class="card profile-card">
        <div class="memory-header">
          <h2>记忆画像</h2>
          <span v-if="profile" class="status">已确认 {{ profileCount }} 条</span>
        </div>
        <p v-if="profileLoading" class="muted">正在加载记忆画像…</p>
        <p v-else-if="profileError" class="error-msg">{{ profileError }}</p>
        <template v-else-if="profile">
          <p v-if="profileImpact" class="memory-content">{{ profileImpact }}</p>
          <p v-else class="muted">陪伴影响还在生成中。</p>
          <div v-if="profileRemembered.length" class="remembered-list">
            <div v-for="item in profileRemembered" :key="item.title + item.summary" class="remembered-item">
              <strong>{{ item.title }}</strong>
              <p v-if="item.summary">{{ item.summary }}</p>
              <p v-if="item.tags.length" class="tags"><span v-for="tag in item.tags" :key="tag">#{{ tag }}</span></p>
            </div>
          </div>
          <p v-else class="muted">目前没有已确认记忆，画像为空。通过候选或手动记下事后会更新。</p>
          <p v-if="profile" class="muted">{{ formatTime(profile.created_at) }}</p>
        </template>
        <p v-else class="muted">还没有记忆画像。新建、编辑、归档或通过一条记忆后，服务端会生成。</p>
      </article>
      <div class="toolbar">
        <input v-model="search" class="input" placeholder="搜索记忆" @keyup.enter="load()" />
        <select v-model="filterStatus" class="select" @change="load()"><option value="">全部状态</option><option value="active">已保存</option><option value="candidate">待确认</option></select>
      </div>
      <button class="btn-primary" type="button" @click="showCreate = !showCreate">{{ showCreate ? '收起新建' : '新建记忆' }}</button>
      <form v-if="showCreate" class="card create-form" @submit.prevent="createMemory">
        <input v-model="title" class="input" maxlength="200" placeholder="标题（可选）" />
        <textarea v-model="content" class="input" rows="4" maxlength="4000" required placeholder="记录一件想让宠物记住的事" />
        <input v-model="tags" class="input" placeholder="标签，用逗号分隔（可选）" />
        <button class="btn-primary" type="submit" :disabled="saving || !content.trim()">{{ saving ? '保存中…' : '保存记忆' }}</button>
      </form>
      <p v-if="loading" class="muted">正在加载记忆…</p><p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <div v-if="!loading && !items.length" class="placeholder-block empty">还没有符合条件的记忆。可以先和宠物聊聊，或手动记下一件重要的事。</div>
      <article v-for="item in items" :key="item.id" class="card memory-item">
        <div class="memory-header"><h2>{{ item.title || '未命名记忆' }}</h2><span class="status" :class="item.status">{{ statusLabel(item.status) }}</span></div>
        <p class="memory-content">{{ item.content }}</p>
        <p v-if="item.tags.length" class="tags"><span v-for="tag in item.tags" :key="tag">#{{ tag }}</span></p>
        <p class="muted">{{ item.source === 'manual' ? '手动记录' : '宠物建议' }} · {{ formatTime(item.updated_at) }}</p>
        <div class="actions"><template v-if="item.status === 'candidate'"><button class="btn-ghost" type="button" :disabled="actionId === item.id" @click="review(item, 'approve')">通过</button><button class="btn-danger" type="button" :disabled="actionId === item.id" @click="review(item, 'reject')">忽略</button></template><button v-else-if="item.status === 'active'" class="btn-danger" type="button" :disabled="actionId === item.id" @click="archive(item)">归档</button></div>
      </article>
      <button v-if="hasMore && items.length" class="btn-ghost load-more" type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? '加载中…' : '加载更多' }}</button>
    </template>
  </div>
</template>

<style scoped>
.page-heading,.toolbar,.memory-header,.actions{display:flex;align-items:center;gap:10px}.page-heading,.memory-header{justify-content:space-between}.page-heading .page-title{margin:4px 0}.toolbar{align-items:stretch}.toolbar .input{flex:1}.select{border:1px solid var(--color-border);border-radius:10px;background:#fff;padding:0 8px;color:var(--color-text)}.text-button{border:0;background:none;color:var(--color-primary);cursor:pointer}.create-form{display:flex;flex-direction:column;gap:10px}.create-form textarea{resize:vertical;font-family:inherit}.memory-item,.profile-card{display:flex;flex-direction:column;gap:8px}.memory-item h2,.profile-card h2{margin:0;font-size:16px}.memory-content,.tags{margin:0;white-space:pre-wrap}.tags{display:flex;flex-wrap:wrap;gap:6px}.tags span,.status{font-size:12px;border-radius:99px;padding:3px 8px;background:var(--color-primary-light);color:var(--color-primary)}.status.candidate{background:#fff5d6;color:#9a6800}.actions{justify-content:flex-end}.btn-danger{border:1px solid #d63031;background:#fff;color:#d63031;border-radius:10px;padding:8px 12px;cursor:pointer}.error-msg{margin:0;color:#d63031;font-size:13px}.empty{min-height:180px}.load-more{align-self:center}.remembered-list{display:flex;flex-direction:column;gap:8px}.remembered-item p{margin:4px 0 0}
</style>
