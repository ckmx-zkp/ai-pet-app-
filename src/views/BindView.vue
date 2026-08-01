<script setup lang="ts">
import { ref } from 'vue'

// P2 绑定设备：扫码取景框占位 + 手动输入 device_uid
const deviceUid = ref('')

function submitBind() {
  // TODO(B2)：调用 POST /devices/bind（body: { device_uid }），
  // 成功 → 回首页并进入人设；409 冲突需提示“设备已被绑定”
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
      <p class="muted">或手动输入设备标识（device_uid，形如 aa:bb:cc:dd:ee:ff）</p>
      <form @submit.prevent="submitBind">
        <input
          v-model.trim="deviceUid"
          class="input"
          type="text"
          placeholder="device_uid"
        />
        <button class="btn-primary" type="submit" :disabled="!deviceUid">绑定</button>
      </form>
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
</style>
