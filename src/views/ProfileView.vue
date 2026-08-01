<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { API_BASE } from '../api/http'

// P8 我的：当前用户信息 + 退出登录 + 设置占位
const router = useRouter()
const auth = useAuthStore()
const loadError = ref('')

onMounted(async () => {
  try {
    await auth.fetchMe()
  } catch {
    loadError.value = '获取用户信息失败（401 会自动回登录页）'
  }
})

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">我的</h1>

    <!-- 账号信息 -->
    <div class="card">
      <h2 class="section-title">账号</h2>
      <template v-if="auth.user">
        <p>账号：{{ auth.user.login_name }}</p>
        <p class="muted">用户 ID：{{ auth.user.id }}</p>
      </template>
      <p v-else class="muted">{{ loadError || '加载中…' }}</p>
    </div>

    <!-- 设置 / API 环境（占位） -->
    <div class="card">
      <h2 class="section-title">设置</h2>
      <p class="muted">当前 API 环境：<code>{{ API_BASE }}</code></p>
      <!-- TODO：内测期允许在此修改 API_BASE（写 localStorage 覆盖，见 docs/05） -->
      <p class="muted">导出我的数据、关于 / 隐私：后续版本提供</p>
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

.logout-btn {
  color: #d63031;
  border-color: #d63031;
}
</style>
