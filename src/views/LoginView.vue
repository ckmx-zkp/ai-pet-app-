<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { API_BASE } from '../api/http'
import axios from 'axios'

// P0 登录/注册：login_name + 密码，登录/注册切换，真实调后端接口
const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const loginName = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function submit() {
  errorMsg.value = ''
  if (!loginName.value || !password.value) {
    errorMsg.value = '请填写账号和密码'
    return
  }
  if (mode.value === 'register' && password.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(loginName.value, password.value)
    } else {
      await auth.register(loginName.value, password.value)
    }
    router.push({ name: 'home' })
  } catch (err) {
    // 优先展示后端返回的错误信息（422 校验失败 / 401 密码错误等）
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { detail?: string; message?: string } | undefined
      errorMsg.value =
        data?.detail ?? data?.message ?? `请求失败（${err.response?.status ?? '网络异常'}）`
    } else {
      errorMsg.value = '请求失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMsg.value = ''
}
</script>

<template>
  <div class="login-page">
    <div class="card login-card">
      <h1 class="login-title">AI Pet</h1>
      <p class="muted">{{ mode === 'login' ? '登录你的账号' : '注册新账号' }}</p>

      <form class="login-form" @submit.prevent="submit">
        <input
          v-model.trim="loginName"
          class="input"
          type="text"
          placeholder="账号（login_name）"
          autocomplete="username"
        />
        <input
          v-model="password"
          class="input"
          type="password"
          placeholder="密码"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        />
        <input
          v-if="mode === 'register'"
          v-model="confirmPassword"
          class="input"
          type="password"
          placeholder="确认密码"
          autocomplete="new-password"
        />

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <button class="btn-primary" type="submit" :disabled="loading">
          {{ loading ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录' }}
        </button>
      </form>

      <button class="switch-mode" type="button" @click="switchMode">
        {{ mode === 'login' ? '没有账号？去注册' : '已有账号？去登录' }}
      </button>

      <!-- 内测期开放的高级项：展示当前 API 地址（修改方式见 .env.example） -->
      <details class="advanced">
        <summary>高级：API 地址</summary>
        <p class="muted">
          当前请求地址：<code>{{ API_BASE }}</code><br />
          内测可通过项目根目录 <code>.env.local</code> 中的
          <code>VITE_API_BASE</code> 修改（参考 <code>.env.example</code>），改后重启 dev 服务生效。
        </p>
      </details>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--color-primary-light);
}

.login-card {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-title {
  margin: 0;
  color: var(--color-primary);
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.error-msg {
  margin: 0;
  color: #d63031;
  font-size: 13px;
}

.switch-mode {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
}

.advanced {
  font-size: 13px;
  color: var(--color-text-dim);
}

.advanced code {
  background: var(--color-primary-light);
  border-radius: 4px;
  padding: 1px 4px;
  word-break: break-all;
}
</style>
