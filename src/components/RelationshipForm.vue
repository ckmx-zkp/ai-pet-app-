<script setup lang="ts">
import { onMounted, ref } from 'vue'
import axios from 'axios'
import http from '../api/http'

const props = defineProps<{ deviceId: number }>()
interface RelationshipKind { kind: string; label: string }
interface Relationship { kind: string; label: string; summary: string }
const kinds = ref<RelationshipKind[]>([])
const kind = ref('')
const summary = ref('')
const loading = ref(true)
const ready = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')

async function load() {
  loading.value = true
  ready.value = false
  error.value = ''
  message.value = ''
  try {
    const [catalog, relationship] = await Promise.all([
      http.get<RelationshipKind[]>('/relationship-kinds'),
      http.get<Relationship>(`/devices/${props.deviceId}/relationship`).catch((cause) => {
        if (axios.isAxiosError(cause) && cause.response?.status === 404) return null
        throw cause
      })
    ])
    kinds.value = catalog.data
    kind.value = relationship?.data.kind ?? ''
    summary.value = relationship?.data.summary ?? ''
    ready.value = true
  } catch {
    error.value = '相处关系加载失败，请重试'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!ready.value || !kind.value || saving.value) return
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const { data } = await http.put<Relationship>(`/devices/${props.deviceId}/relationship`, {
      kind: kind.value, summary: summary.value.trim()
    })
    kind.value = data.kind
    summary.value = data.summary
    message.value = '相处关系已保存，下次和宠物说话时采用'
  } catch (cause) {
    const status = axios.isAxiosError(cause) ? cause.response?.status : undefined
    error.value = status === 409 ? '请先到宠物性格页设置星座和 MBTI'
      : status === 422 ? '请重新选择关系，并将相处说明缩短到 200 字以内'
      : '相处关系保存失败，请重试'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="card relationship-form" aria-labelledby="relationship-title">
    <h2 id="relationship-title">我们的相处关系</h2>
    <p class="muted">选择你希望和星仔如何相处。关系按每只星仔分别保存。</p>
    <p v-if="loading" role="status">正在加载相处关系…</p>
    <form v-else-if="ready" @submit.prevent="save">
      <label for="relationship-kind">关系类型</label>
      <select id="relationship-kind" v-model="kind" class="input" required :disabled="saving">
        <option disabled value="">尚未设置，请选择</option>
        <option v-for="item in kinds" :key="item.kind" :value="item.kind">{{ item.label }}</option>
      </select>
      <label for="relationship-summary">相处说明（选填）</label>
      <textarea id="relationship-summary" v-model="summary" class="input" rows="3"
        maxlength="200" :disabled="saving" placeholder="例如：像家人一样相处，难过时先陪我聊聊" />
      <span class="muted">{{ summary.length }}/200</span>
      <button class="btn-primary" type="submit" :disabled="saving || !kind">
        {{ saving ? '保存中…' : '保存相处关系' }}
      </button>
    </form>
    <p v-if="error" class="error-msg" role="alert">{{ error }}</p>
    <button v-if="!loading && !ready" class="btn-primary" type="button" @click="load">重试加载相处关系</button>
    <p v-if="message" class="muted" role="status">{{ message }}</p>
  </section>
</template>

<style scoped>
h2 { margin: 0; font-size: 16px; }
form { display: grid; gap: 10px; }
textarea, select { font: inherit; width: 100%; box-sizing: border-box; }
textarea { resize: vertical; }
.error-msg { color: #b42318; }
</style>
