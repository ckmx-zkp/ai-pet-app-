<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import http from '../api/http'
import type { ChatMessage } from '../api/types'
import { useDeviceStore } from '../stores/devices'

const PAGE_SIZE = 20
const devices = useDeviceStore()
const messages = ref<ChatMessage[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const deletingDay = ref('')
const errorMsg = ref('')

const hasMore = ref(true)
const activeDeviceId = computed(() => devices.activeDeviceId)

const groupedMessages = computed(() => {
  const groups = new Map<string, ChatMessage[]>()
  for (const message of messages.value) {
    const day = new Date(message.created_at).toLocaleDateString('zh-CN')
    const group = groups.get(day) ?? []
    group.push(message)
    groups.set(day, group)
  }
  return [...groups.entries()].map(([day, items]) => ({ day, items }))
})

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function roleLabel(role: ChatMessage['role']) {
  return role === 'user' ? '我' : role === 'assistant' ? 'AI Pet' : '系统'
}

async function fetchMessages(offset = 0) {
  if (!activeDeviceId.value) return
  const { data } = await http.get<ChatMessage[]>(`/devices/${activeDeviceId.value}/messages`, {
    params: { limit: PAGE_SIZE, offset }
  })
  messages.value = offset === 0 ? data : [...messages.value, ...data]
  hasMore.value = data.length === PAGE_SIZE
}

async function loadMessages() {
  if (!activeDeviceId.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    await fetchMessages()
  } catch {
    errorMsg.value = '加载历史失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true
  try {
    await fetchMessages(messages.value.length)
  } catch {
    errorMsg.value = '加载更多历史失败，请稍后重试'
  } finally {
    loadingMore.value = false
  }
}

function dayRange(day: string) {
  const [year, month, date] = day.split('/').map(Number)
  const start = new Date(year, month - 1, date)
  const end = new Date(year, month - 1, date + 1)
  end.setMilliseconds(end.getMilliseconds() - 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

async function deleteDay(day: string) {
  if (!activeDeviceId.value || !window.confirm(`确认删除 ${day} 的全部历史记录吗？此操作无法撤销。`)) return
  deletingDay.value = day
  errorMsg.value = ''
  try {
    await http.delete(`/devices/${activeDeviceId.value}/messages`, { params: dayRange(day) })
    await loadMessages()
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      errorMsg.value = '删除范围无效，请稍后重试'
    } else {
      errorMsg.value = '删除历史失败，请稍后重试'
    }
  } finally {
    deletingDay.value = ''
  }
}

onMounted(loadMessages)
</script>

<template>
  <div class="page">
    <h1 class="page-title">历史</h1>
    <div v-if="!activeDeviceId" class="placeholder-block empty">
      请先在首页选择已绑定设备，再查看聊天历史。
    </div>
    <template v-else>
      <p v-if="loading" class="muted">正在加载历史…</p>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <div v-if="!loading && !groupedMessages.length" class="placeholder-block empty">
        还没有聊天记录，和宠物说第一句话吧
      </div>
      <section v-for="group in groupedMessages" :key="group.day" class="history-day">
        <div class="day-header">
          <h2>{{ group.day }}</h2>
          <button type="button" class="delete-button" :disabled="deletingDay === group.day" @click="deleteDay(group.day)">
            {{ deletingDay === group.day ? '删除中…' : '删除当天' }}
          </button>
        </div>
        <article v-for="message in group.items" :key="message.id" class="card message-item" :class="message.role">
          <div class="message-meta"><span>{{ roleLabel(message.role) }}</span><time>{{ formatTime(message.created_at) }}</time></div>
          <p>{{ message.content_redacted }}</p>
        </article>
      </section>
      <button v-if="hasMore && messages.length" class="btn-ghost load-more" type="button" :disabled="loadingMore" @click="loadMore">
        {{ loadingMore ? '加载中…' : '加载更多' }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.empty {
  min-height: 200px;
}

.error-msg {
  margin: 0;
  color: #d63031;
  font-size: 13px;
}

.history-day {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-header,
.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.day-header h2 {
  margin: 0;
  font-size: 16px;
}

.delete-button {
  border: 0;
  background: none;
  color: #d63031;
  cursor: pointer;
  font-size: 13px;
}

.message-item {
  padding: 12px;
}

.message-item p {
  margin: 8px 0 0;
  white-space: pre-wrap;
  line-height: 1.5;
}

.message-meta {
  color: var(--color-text-dim);
  font-size: 12px;
}

.message-item.user {
  border-left: 3px solid var(--color-primary);
}

.load-more {
  align-self: center;
}
</style>
