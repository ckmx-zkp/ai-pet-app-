<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import http from '../api/http'
import type { FunQuizDetail, FunQuizListItem, NatalChart, QuizAttempt, ShareCard } from '../api/types'
import { useDeviceStore } from '../stores/devices'
import { downloadBlob, renderSharePoster } from '../utils/poster'

const devices = useDeviceStore()
const tab = ref<'quiz' | 'chart'>('quiz')
const quizzes = ref<FunQuizListItem[]>([])
const listError = ref('')
const activeQuiz = ref<FunQuizDetail | null>(null)
const answers = ref<string[]>([])
const submitting = ref(false)
const attempt = ref<QuizAttempt | null>(null)
const shareBusy = ref(false)
const shareHint = ref('')

const birthDate = ref('')
const birthTime = ref('')
const birthPlace = ref('北京')
const useBazi = ref(false)
const chart = ref<NatalChart | null>(null)
const chartError = ref('')
const chartLoading = ref(false)

const kindLabel: Record<string, string> = {
  psychology: '心理',
  astrology: '星座',
  metaphysics: '玄学'
}

const bodyOrder = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const
const bodyLabel: Record<string, string> = {
  sun: '太阳',
  moon: '月亮',
  mercury: '水星',
  venus: '金星',
  mars: '火星',
  jupiter: '木星',
  saturn: '土星'
}

const deviceId = computed(() => devices.activeDeviceId)

onMounted(async () => {
  await devices.fetchDevices()
  await loadQuizzes()
  await loadChart()
})

async function loadQuizzes() {
  listError.value = ''
  try {
    const { data } = await http.get<FunQuizListItem[]>('/fun-quizzes', { params: { limit: 20 } })
    quizzes.value = data
  } catch {
    listError.value = '测验列表加载失败'
  }
}

async function openQuiz(id: number) {
  attempt.value = null
  shareHint.value = ''
  const { data } = await http.get<FunQuizDetail>(`/fun-quizzes/${id}`)
  activeQuiz.value = data
  answers.value = data.questions.map(() => '')
}

async function submitQuiz() {
  if (!activeQuiz.value) return
  if (answers.value.some((item) => !item)) {
    shareHint.value = '请答完所有题目'
    return
  }
  submitting.value = true
  shareHint.value = ''
  try {
    const { data } = await http.post<QuizAttempt>(`/fun-quizzes/${activeQuiz.value.id}/submit`, {
      answers: answers.value,
      device_id: deviceId.value,
      apply: 'none'
    })
    attempt.value = data
  } catch (error) {
    shareHint.value = axios.isAxiosError(error) ? '提交失败，请检查是否答完' : '提交失败'
  } finally {
    submitting.value = false
  }
}

async function saveToPet() {
  if (!activeQuiz.value || !deviceId.value) {
    shareHint.value = '请先绑定并选择一只宠物'
    return
  }
  submitting.value = true
  try {
    const { data } = await http.post<QuizAttempt>(`/fun-quizzes/${activeQuiz.value.id}/submit`, {
      answers: answers.value,
      device_id: deviceId.value,
      apply: 'memory'
    })
    attempt.value = data
    shareHint.value = '已写成一条记忆，下次对话可能会提到'
  } finally {
    submitting.value = false
  }
}

async function savePoster(card: ShareCard, name: string) {
  shareBusy.value = true
  shareHint.value = ''
  try {
    const blob = await renderSharePoster(card)
    if (navigator.share && navigator.canShare?.({ files: [new File([blob], name, { type: 'image/png' })] })) {
      await navigator.share({
        files: [new File([blob], name, { type: 'image/png' })],
        title: card.result
      })
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

async function loadChart() {
  if (!deviceId.value) return
  try {
    const { data } = await http.get<NatalChart>(`/devices/${deviceId.value}/natal-chart`)
    chart.value = data
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      chartError.value = '星盘加载失败'
    }
  }
}

async function computeChart() {
  if (!deviceId.value) {
    chartError.value = '请先绑定设备'
    return
  }
  chartLoading.value = true
  chartError.value = ''
  try {
    const { data } = await http.put<NatalChart>(`/devices/${deviceId.value}/natal-chart`, {
      birth_date: useBazi.value ? undefined : birthDate.value || undefined,
      birth_time: birthTime.value || null,
      birth_place: birthPlace.value || null,
      use_bazi: useBazi.value
    })
    chart.value = data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      chartError.value = '请填写公历生日，或先在人设页录入公历八字'
    } else {
      chartError.value = '计算失败'
    }
  } finally {
    chartLoading.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">测试</h1>
    <p class="muted">20 题以内的小测验和测测风格简略星盘。默认只自己看，想让宠物知道再同步。</p>

    <div class="tabs">
      <button type="button" :class="{ active: tab === 'quiz' }" @click="tab = 'quiz'">趣味测验</button>
      <button type="button" :class="{ active: tab === 'chart' }" @click="tab = 'chart'">简略星盘</button>
    </div>

    <template v-if="tab === 'quiz'">
      <div v-if="!activeQuiz" class="stack">
        <p v-if="listError" class="error-msg">{{ listError }}</p>
        <button
          v-for="item in quizzes"
          :key="item.id"
          class="card quiz-card"
          type="button"
          @click="openQuiz(item.id)"
        >
          <span class="kind">{{ kindLabel[item.kind] ?? item.kind }}</span>
          <strong>{{ item.title }}</strong>
          <span class="muted">{{ item.subtitle }} · {{ item.question_count }} 题</span>
        </button>
        <p v-if="!quizzes.length && !listError" class="muted">还没有测验，明天会自动出新题；种子题部署后即可玩。</p>
      </div>

      <div v-else class="stack">
        <button class="btn-ghost" type="button" @click="activeQuiz = null; attempt = null">返回列表</button>
        <div class="card">
          <h2 class="section-title">{{ activeQuiz.title }}</h2>
          <p class="muted">{{ activeQuiz.subtitle }}</p>
          <div v-for="(question, index) in activeQuiz.questions" :key="question.id" class="q">
            <p>{{ index + 1 }}. {{ question.prompt }}</p>
            <label v-for="option in question.options" :key="option.key" class="opt">
              <input v-model="answers[index]" type="radio" :value="option.key" />
              {{ option.text }}
            </label>
          </div>
          <button class="btn-primary" type="button" :disabled="submitting" @click="submitQuiz">
            {{ submitting ? '提交中…' : '看结果' }}
          </button>
        </div>

        <div v-if="attempt" class="card result">
          <p class="muted">{{ attempt.share_card.title }}</p>
          <h2>{{ attempt.result.title }}</h2>
          <p>{{ attempt.result.summary }}</p>
          <div class="actions">
            <button class="btn-primary" type="button" :disabled="shareBusy" @click="savePoster(attempt.share_card, 'ai-pet-quiz.png')">
              保存海报发朋友圈
            </button>
            <button class="btn-ghost" type="button" :disabled="submitting || !deviceId" @click="saveToPet">
              写成宠物记忆
            </button>
          </div>
          <p v-if="shareHint" class="muted">{{ shareHint }}</p>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="card stack">
        <p class="muted">简略版：太阳、月亮、水金火木土；填了出生时刻和城市才有上升。不作专业占星。</p>
        <label class="opt"><input v-model="useBazi" type="checkbox" /> 用已录入的公历八字计算</label>
        <template v-if="!useBazi">
          <label>公历生日<input v-model="birthDate" class="input" type="date" /></label>
          <label>出生时刻（可空）<input v-model="birthTime" class="input" type="time" /></label>
          <label>出生城市<input v-model="birthPlace" class="input" type="text" placeholder="北京" /></label>
        </template>
        <button class="btn-primary" type="button" :disabled="chartLoading" @click="computeChart">
          {{ chartLoading ? '计算中…' : '生成星盘' }}
        </button>
        <p v-if="chartError" class="error-msg">{{ chartError }}</p>
      </div>

      <div v-if="chart" class="card result">
        <h2>{{ chart.headline }}</h2>
        <p v-if="chart.ascendant" class="muted">上升 {{ chart.ascendant.sign_zh }} · {{ chart.ascendant.blurb }}</p>
        <ul>
          <li v-for="key in bodyOrder" :key="key">
            <strong>{{ bodyLabel[key] }}</strong>
            {{ chart.bodies[key]?.sign_zh }} — {{ chart.bodies[key]?.blurb }}
          </li>
        </ul>
        <button class="btn-primary" type="button" :disabled="shareBusy" @click="savePoster(chart.share_card, 'ai-pet-natal.png')">
          保存海报发朋友圈
        </button>
        <p v-if="shareHint" class="muted">{{ shareHint }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
.tabs button {
  flex: 1;
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 10px;
  padding: 8px;
}
.tabs button.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.quiz-card {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}
.kind {
  color: var(--color-primary);
  font-size: 12px;
}
.q {
  margin: 12px 0;
}
.opt {
  display: flex;
  gap: 8px;
  margin: 6px 0;
}
.result h2 {
  margin: 6px 0 10px;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 8px 0;
}
</style>
