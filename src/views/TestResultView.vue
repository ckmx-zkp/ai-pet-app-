<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'
import type { QuizAttempt, ShareCard } from '../api/types'
import { useDeviceStore } from '../stores/devices'
import { useQuizSession } from '../stores/quizSession'
import { downloadBlob, renderSharePoster, resolvePosterPalette } from '../utils/poster'

const router = useRouter()
const devices = useDeviceStore()
const session = useQuizSession()
const submitting = ref(false)
const shareBusy = ref(false)
const shareHint = ref('')

const attempt = computed(() => session.attempt)
const palette = computed(() => (attempt.value ? resolvePosterPalette(attempt.value.share_card) : null))
const deviceId = computed(() => devices.activeDeviceId)

onMounted(() => {
  if (!session.attempt) router.replace({ name: 'tests' })
})

function backToList() {
  session.clear()
  router.push({ name: 'tests' })
}

async function savePoster(card: ShareCard) {
  shareBusy.value = true
  shareHint.value = ''
  try {
    const blob = await renderSharePoster(card)
    const name = 'shouhuxing-quiz.png'
    if (navigator.share && navigator.canShare?.({ files: [new File([blob], name, { type: 'image/png' })] })) {
      await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], title: card.result })
      shareHint.value = '已调起系统分享，可存图后发朋友圈'
    } else {
      downloadBlob(blob, name)
      shareHint.value = '海报已保存，打开相册发到朋友圈吧'
    }
  } catch {
    shareHint.value = '生成海报失败，请换个浏览器再试'
  } finally {
    shareBusy.value = false
  }
}

async function saveToPet() {
  if (!attempt.value || !deviceId.value) {
    shareHint.value = '请先绑定并选择一只宠物'
    return
  }
  submitting.value = true
  shareHint.value = ''
  try {
    const { data } = await http.post<QuizAttempt>(`/fun-quizzes/${attempt.value.quiz_id}/submit`, {
      answers: session.answers,
      device_id: deviceId.value,
      apply: 'memory'
    })
    session.setAttempt(data, session.answers)
    shareHint.value = '已写成一条记忆，下次对话可能会提到'
  } catch {
    shareHint.value = '写成记忆失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="attempt && palette" class="page">
    <div class="hero" :style="{ background: `linear-gradient(160deg, ${palette.from}, ${palette.to})` }">
      <p class="hero-kicker">{{ attempt.share_card.title }}</p>
      <h1 class="hero-title">{{ attempt.result.title }}</h1>
      <p class="hero-summary">{{ attempt.result.summary }}</p>
    </div>
    <div class="card actions">
      <button class="btn-primary" type="button" :disabled="shareBusy" @click="savePoster(attempt.share_card)">
        {{ shareBusy ? '生成中…' : '保存海报发朋友圈' }}
      </button>
      <button class="btn-ghost" type="button" :disabled="submitting || !deviceId" @click="saveToPet">
        {{ submitting ? '写入中…' : '写成宠物记忆' }}
      </button>
      <p v-if="shareHint" class="muted">{{ shareHint }}</p>
      <button class="text-back" type="button" @click="backToList">返回测验列表</button>
    </div>
  </div>
</template>

<style scoped>
.hero {
  border-radius: 16px;
  padding: 28px 20px 32px;
  color: #fff;
  min-height: 220px;
}
.hero-kicker {
  margin: 0 0 10px;
  opacity: 0.85;
  font-size: 14px;
}
.hero-title {
  margin: 0 0 16px;
  font-size: 32px;
  line-height: 1.25;
}
.hero-summary {
  margin: 0;
  font-size: 16px;
  line-height: 1.65;
  opacity: 0.92;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.text-back {
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: 14px;
  padding: 8px 0 0;
  cursor: pointer;
}
</style>
