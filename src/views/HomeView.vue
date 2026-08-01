<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDeviceStore } from '../stores/devices'

const devices = useDeviceStore()
const loading = ref(false)
const errorMsg = ref('')
const activeDevice = computed(() => devices.activeDevice)

function formatLastSeen(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无活跃记录'
}

async function loadDevices() {
  loading.value = true
  errorMsg.value = ''
  try {
    await devices.fetchDevices()
  } catch {
    errorMsg.value = '加载设备失败，请稍后重试'
  } finally {
    loading.value = false
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

    <div v-if="devices.devices.length" class="card device-list">
      <div class="section-heading">
        <h2>我的设备</h2>
        <button class="refresh-button" type="button" :disabled="loading" @click="loadDevices">刷新</button>
      </div>
      <button
        v-for="device in devices.devices"
        :key="device.id"
        class="device-item"
        :class="{ active: device.id === devices.activeDeviceId }"
        type="button"
        @click="devices.setActiveDevice(device.id)"
      >
        <span>{{ device.name || device.device_uid }}</span>
        <span class="muted">{{ device.online ? '在线' : '离线' }}</span>
      </button>
    </div>

    <!-- 功能入口 -->
    <div class="entry-grid">
      <RouterLink class="btn-primary entry" :to="{ name: 'bind' }">绑定设备</RouterLink>
      <RouterLink
        class="btn-ghost entry"
        :to="activeDevice ? { name: 'persona', query: { deviceId: activeDevice.id } } : { name: 'bind' }"
      >
        {{ activeDevice ? '设置人设' : '先绑定设备' }}
      </RouterLink>
      <RouterLink class="btn-ghost entry" :to="{ name: 'daily' }">日运/小记</RouterLink>
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
</style>
