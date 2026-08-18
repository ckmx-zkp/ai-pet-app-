<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import http from '../api/http'
import type { Device } from '../api/types'
import { useDeviceStore } from '../stores/devices'

// P2 绑定设备：扫码取景框占位 + 手动输入 binding_id。
// MAC/device_uid 仅在设备、小智与后端之间流转，不能作为用户认领凭据。
const bindingId = ref('')
const loading = ref(false)
const errorMsg = ref('')
const boundDevice = ref<Device | null>(null)
const devices = useDeviceStore()

async function submitBind() {
  errorMsg.value = ''
  boundDevice.value = null
  if (!bindingId.value) {
    errorMsg.value = '请输入绑定码'
    return
  }

  loading.value = true
  try {
    const { data } = await http.post<Device>('/devices/bind', {
      binding_id: bindingId.value
    })
    boundDevice.value = data
    devices.setActiveDevice(data.id)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 403) {
        errorMsg.value = '请使用普通用户账号绑定设备'
      } else if (status === 404) {
        errorMsg.value = '绑定码不存在或已失效，请检查设备二维码'
      } else if (status === 409) {
        errorMsg.value = '该设备已被其他用户认领'
      } else if (status === 422) {
        errorMsg.value = '绑定码格式不正确，请检查后重试'
      } else {
        const data = error.response?.data as { detail?: string } | undefined
        errorMsg.value = data?.detail ?? '绑定失败，请稍后重试'
      }
    } else {
      errorMsg.value = '绑定失败，请检查网络后重试'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">绑定设备</h1>

    <!-- 扫码取景框占位（PWA 暂不接相机，后续 Capacitor 包壳时可换真扫码） -->
    <div class="placeholder-block scan-frame">
      扫码取景框占位<br />对准设备上的二维码
    </div>

    <div class="card manual-form">
      <p class="muted">或手动输入设备二维码上的绑定码（binding_id）</p>
      <form @submit.prevent="submitBind">
        <input
          v-model.trim="bindingId"
          class="input"
          type="text"
          placeholder="binding_id"
        />
        <button class="btn-primary" type="submit" :disabled="!bindingId || loading">
          {{ loading ? '绑定中…' : '绑定' }}
        </button>
      </form>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <div v-if="boundDevice" class="bind-success">
        <p>绑定成功：{{ boundDevice.name || boundDevice.device_uid }}</p>
        <p class="muted">设备标识：{{ boundDevice.device_uid }}</p>
        <RouterLink
          class="btn-ghost"
          :to="{ name: 'persona', query: { deviceId: boundDevice.id } }"
        >
          设置宠物性格
        </RouterLink>
      </div>
    </div>

    <p class="muted">
      还没有配网？先按设备说明让它连上 Wi-Fi，设备上线后这里就能绑定了。
    </p>
  </div>
</template>

<style scoped>
.scan-frame {
  aspect-ratio: 4 / 3;
  flex-direction: column;
  gap: 6px;
}

.manual-form form {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.manual-form .input {
  flex: 1;
}

.error-msg {
  margin: 10px 0 0;
  color: #d63031;
  font-size: 13px;
}

.bind-success {
  margin-top: 12px;
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.bind-success p {
  margin: 0 0 6px;
}

.bind-success .btn-ghost {
  display: inline-block;
  margin-top: 4px;
  text-decoration: none;
}
</style>
