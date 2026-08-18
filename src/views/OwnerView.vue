<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import http from '../api/http'
import type { BaziProfile, OwnerPayload, OwnerProfile, QuestionnaireOut } from '../api/types'
import { useDeviceStore } from '../stores/devices'

// 用户性格：账号一份。问卷与八字写主人，不改宠物性格。
const zodiacs = [
  { key: 'aries', label: '白羊座' }, { key: 'taurus', label: '金牛座' },
  { key: 'gemini', label: '双子座' }, { key: 'cancer', label: '巨蟹座' },
  { key: 'leo', label: '狮子座' }, { key: 'virgo', label: '处女座' },
  { key: 'libra', label: '天秤座' }, { key: 'scorpio', label: '天蝎座' },
  { key: 'sagittarius', label: '射手座' }, { key: 'capricorn', label: '摩羯座' },
  { key: 'aquarius', label: '水瓶座' }, { key: 'pisces', label: '双鱼座' }
]

const mbtiDims = [
  { key: 'EI', options: ['E', 'I'], label: '精力来源：外向 E / 内向 I' },
  { key: 'SN', options: ['S', 'N'], label: '认知方式：实感 S / 直觉 N' },
  { key: 'TF', options: ['T', 'F'], label: '判断方式：思考 T / 情感 F' },
  { key: 'JP', options: ['J', 'P'], label: '生活态度：判断 J / 知觉 P' }
] as const

const route = useRoute()
const devices = useDeviceStore()
const deviceId = computed(() => devices.activeDeviceId)

const zodiac = ref('')
const mbti = ref<Record<string, string>>({ EI: '', SN: '', TF: '', JP: '' })
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const savedTip = ref('')

const quizOpen = ref(false)
const quiz = ref<QuestionnaireOut | null>(null)
const quizAnswers = ref<string[]>([])
const quizLoading = ref(false)
const quizSaving = ref(false)
const quizError = ref('')
const quizTip = ref('')

const baziCalendar = ref<'solar' | 'lunar'>('solar')
const baziDate = ref('')
const baziTime = ref('')
const baziTimeUnknown = ref(false)
const baziPlace = ref('')
const baziGender = ref('')
const baziSaving = ref(false)
const baziError = ref('')
const baziTip = ref('')

const selectedMbti = computed(() => `${mbti.value.EI}${mbti.value.SN}${mbti.value.TF}${mbti.value.JP}`)
const zodiacLabel = computed(() => zodiacs.find((item) => item.key === zodiac.value)?.label ?? '')

function applyOwner(profile: OwnerProfile) {
  zodiac.value = profile.sun_sign ?? ''
  const value = profile.mbti ?? ''
  mbti.value = { EI: value[0] ?? '', SN: value[1] ?? '', TF: value[2] ?? '', JP: value[3] ?? '' }
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadOwner() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { data } = await http.get<OwnerProfile>('/owner')
    applyOwner(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return
    errorMsg.value = '加载用户性格失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function saveOwner() {
  if (!zodiac.value && selectedMbti.value.length !== 4) {
    errorMsg.value = '请选择星座，或完成四个性格维度'
    return
  }
  if (selectedMbti.value.length > 0 && selectedMbti.value.length !== 4) {
    errorMsg.value = '请完成四个性格维度，或先清空再只保存星座'
    return
  }
  saving.value = true
  errorMsg.value = ''
  savedTip.value = ''
  const payload: OwnerPayload = {}
  if (zodiac.value) payload.sun_sign = zodiac.value
  if (selectedMbti.value.length === 4) payload.mbti = selectedMbti.value
  try {
    const { data } = await http.put<OwnerProfile>('/owner', payload)
    applyOwner(data)
    savedTip.value = '已保存你的性格，日运会按你的星座生成'
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      errorMsg.value = '星座或性格组合暂不可用，请检查后重试'
    } else {
      errorMsg.value = '保存失败，请稍后重试'
    }
  } finally {
    saving.value = false
  }
}

async function loadQuiz() {
  if (quizLoading.value) return
  quizLoading.value = true
  quizError.value = ''
  try {
    const { data } = await http.get<QuestionnaireOut>('/owner/questionnaire')
    quiz.value = data
    quizAnswers.value = Array.from({ length: data.answers_required }, (_, index) => quizAnswers.value[index] || '')
  } catch {
    quizError.value = '加载用户性格测试失败，请稍后重试'
  } finally {
    quizLoading.value = false
  }
}

async function openQuiz(forceOpen = false) {
  quizOpen.value = forceOpen ? true : !quizOpen.value
  quizTip.value = ''
  if (quizOpen.value && !quiz.value) await loadQuiz()
  if (quizOpen.value) await nextTick(() => scrollToId('owner-quiz'))
}

async function jumpToQuiz() {
  await openQuiz(true)
}

function setQuizAnswer(index: number, choice: string) {
  const next = [...quizAnswers.value]
  next[index] = choice
  quizAnswers.value = next
}

async function submitQuiz() {
  if (!quiz.value) return
  if (quizAnswers.value.length !== quiz.value.answers_required || quizAnswers.value.some((item) => item !== 'a' && item !== 'b')) {
    quizError.value = `请答完 ${quiz.value.answers_required} 题（每题选 A 或 B）`
    return
  }
  quizSaving.value = true
  quizError.value = ''
  quizTip.value = ''
  try {
    const { data } = await http.post<OwnerProfile>('/owner/questionnaire', {
      answers: quizAnswers.value,
      sun_sign: zodiac.value || undefined
    })
    applyOwner(data)
    quizTip.value = `测出的性格是 ${data.mbti ?? '未知'}，已写入你的档案，不会改星仔的性格。`
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      quizError.value = '请确保 20 题都选了 A 或 B'
    } else {
      quizError.value = '提交测试失败，请稍后重试'
    }
  } finally {
    quizSaving.value = false
  }
}

function applyBazi(profile: BaziProfile) {
  baziCalendar.value = profile.calendar_type === 'lunar' ? 'lunar' : 'solar'
  baziDate.value = profile.birth_date
  const time = profile.birth_time ?? ''
  baziTimeUnknown.value = !time
  baziTime.value = time.slice(0, 5)
  baziPlace.value = profile.birth_place ?? ''
  baziGender.value = profile.gender ?? ''
}

async function loadBazi() {
  if (!deviceId.value) return
  baziError.value = ''
  try {
    const { data } = await http.get<BaziProfile>(`/devices/${deviceId.value}/bazi`)
    applyBazi(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return
    baziError.value = '加载生辰失败，请稍后重试'
  }
}

async function saveBazi() {
  if (!deviceId.value) return
  if (!baziDate.value) {
    baziError.value = '请选择出生日期'
    return
  }
  if (!baziTimeUnknown.value && !baziTime.value) {
    baziError.value = '请选择出生时辰，或勾选「时辰未知」'
    return
  }
  baziSaving.value = true
  baziError.value = ''
  baziTip.value = ''
  const payload: BaziProfile = {
    calendar_type: baziCalendar.value,
    birth_date: baziDate.value,
    birth_time: baziTimeUnknown.value ? null : baziTime.value,
    birth_place: baziPlace.value.trim() || null,
    gender: baziGender.value || null
  }
  try {
    const { data } = await http.put<BaziProfile>(`/devices/${deviceId.value}/bazi`, payload)
    applyBazi(data)
    baziTip.value = '已保存，可到日运页查看今日八字运势（生成需要一点时间）'
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      baziError.value = '出生信息格式有误，请检查后重试'
    } else {
      baziError.value = '保存失败，请稍后重试'
    }
  } finally {
    baziSaving.value = false
  }
}

async function openQuizFromHash() {
  if (route.hash !== '#quiz') return
  quizOpen.value = true
  if (!quiz.value) await loadQuiz()
  await nextTick(() => scrollToId('owner-quiz'))
}

onMounted(async () => {
  if (!devices.devices.length) {
    try {
      await devices.fetchDevices()
    } catch {
      // 用户性格不依赖设备；设备列表失败只影响生辰卡
    }
  }
  await Promise.all([loadOwner(), loadBazi()])
  await openQuizFromHash()
})

watch(() => route.hash, () => {
  void openQuizFromHash()
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">用户性格</h1>
    <p class="muted">测的是你自己，账号一份、所有宠物共享。和星仔的宠物性格是两回事。</p>

    <nav class="jump-nav" aria-label="快捷跳转">
      <button class="jump-chip" type="button" @click="scrollToId('owner-sign')">我的星座</button>
      <button class="jump-chip" type="button" @click="jumpToQuiz">用户性格测试</button>
      <button class="jump-chip" type="button" @click="scrollToId('owner-bazi')">主人生辰</button>
      <RouterLink class="jump-chip" :to="{ name: 'tests' }">趣味测试</RouterLink>
      <RouterLink class="jump-chip" :to="{ name: 'persona' }">宠物性格</RouterLink>
    </nav>

    <p v-if="loading" class="muted">正在加载你的性格…</p>
    <p v-if="zodiacLabel || selectedMbti.length === 4" class="muted">
      当前：{{ zodiacLabel || '未选星座' }}
      <template v-if="selectedMbti.length === 4"> · {{ selectedMbti }}</template>
    </p>

    <div id="owner-sign" class="card jump-anchor">
      <h2 class="section-title">我的星座</h2>
      <p class="muted">日运按你的星座生成，不会改成星仔的星座。</p>
      <div class="zodiac-grid">
        <button
          v-for="z in zodiacs"
          :key="z.key"
          type="button"
          class="zodiac-item"
          :class="{ active: zodiac === z.key }"
          @click="zodiac = z.key"
        >
          {{ z.label }}
        </button>
      </div>
      <h3 class="section-title mbti-title">我的性格（可直选）</h3>
      <div v-for="dim in mbtiDims" :key="dim.key" class="mbti-row">
        <span class="muted">{{ dim.label }}</span>
        <div class="mbti-options">
          <button
            v-for="opt in dim.options"
            :key="opt"
            type="button"
            class="mbti-item"
            :class="{ active: mbti[dim.key] === opt }"
            @click="mbti[dim.key] = opt"
          >
            {{ opt }}
          </button>
        </div>
      </div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <button class="btn-primary" type="button" :disabled="loading || saving" @click="saveOwner">
        {{ saving ? '保存中…' : '保存我的性格' }}
      </button>
      <p v-if="savedTip" class="muted">{{ savedTip }}</p>
    </div>

    <div id="owner-quiz" class="card quiz-card jump-anchor">
      <div class="quiz-header">
        <div>
          <h2 class="section-title">用户性格测试</h2>
          <p class="muted">20 题测主人性格，由后端计分。结果只写入你的档案，不会覆盖星仔。</p>
        </div>
        <button class="btn-ghost" type="button" :disabled="quizLoading" @click="openQuiz()">
          {{ quizOpen ? '收起测试' : (quizLoading ? '加载中…' : '开始测试') }}
        </button>
      </div>
      <template v-if="quizOpen">
        <p v-if="quizLoading" class="muted">正在加载题面…</p>
        <ol v-else-if="quiz" class="quiz-list">
          <li v-for="(question, index) in quiz.questions" :key="question.id" class="quiz-item">
            <p class="quiz-prompt">{{ index + 1 }}. {{ question.prompt }}</p>
            <div class="quiz-options">
              <button
                type="button"
                class="quiz-choice"
                :class="{ active: quizAnswers[index] === 'a' }"
                @click="setQuizAnswer(index, 'a')"
              >
                A. {{ question.a }}
              </button>
              <button
                type="button"
                class="quiz-choice"
                :class="{ active: quizAnswers[index] === 'b' }"
                @click="setQuizAnswer(index, 'b')"
              >
                B. {{ question.b }}
              </button>
            </div>
          </li>
        </ol>
        <button
          v-if="quiz"
          class="btn-primary"
          type="button"
          :disabled="quizSaving"
          @click="submitQuiz"
        >
          {{ quizSaving ? '提交中…' : '提交测试' }}
        </button>
        <p v-if="quizTip" class="muted">{{ quizTip }}</p>
        <p v-if="quizError" class="error-msg">{{ quizError }}</p>
      </template>
    </div>

    <div id="owner-bazi" class="card bazi-card jump-anchor">
      <h2 class="section-title">主人生辰</h2>
      <p class="muted">用于生成每日八字运势，仅自己可见。和星仔性格无关。</p>
      <template v-if="!deviceId">
        <p class="muted">生辰需要先绑定一台设备后再录入（账号一份，多设备共享）。</p>
        <RouterLink class="star-link" :to="{ name: 'bind' }">去绑定设备</RouterLink>
      </template>
      <template v-else>
        <div class="bazi-row">
          <span class="muted">历法</span>
          <div class="bazi-options">
            <button
              type="button"
              class="mbti-item bazi-item"
              :class="{ active: baziCalendar === 'solar' }"
              @click="baziCalendar = 'solar'"
            >
              阳历
            </button>
            <button
              type="button"
              class="mbti-item bazi-item"
              :class="{ active: baziCalendar === 'lunar' }"
              @click="baziCalendar = 'lunar'"
            >
              阴历
            </button>
          </div>
        </div>
        <label class="bazi-row">
          <span class="muted">出生日期</span>
          <input v-model="baziDate" class="input bazi-input" type="date" />
        </label>
        <div class="bazi-row">
          <span class="muted">出生时辰</span>
          <input v-model="baziTime" class="input bazi-input" type="time" :disabled="baziTimeUnknown" />
        </div>
        <label class="bazi-row bazi-checkbox">
          <input v-model="baziTimeUnknown" type="checkbox" />
          <span class="muted">时辰未知</span>
        </label>
        <label class="bazi-row">
          <span class="muted">出生地</span>
          <input v-model="baziPlace" class="input bazi-input" type="text" maxlength="128" placeholder="选填，例如：北京" />
        </label>
        <label class="bazi-row">
          <span class="muted">性别</span>
          <select v-model="baziGender" class="input bazi-input">
            <option value="">不便透露</option>
            <option value="female">女</option>
            <option value="male">男</option>
          </select>
        </label>
        <p v-if="baziError" class="error-msg">{{ baziError }}</p>
        <button class="btn-primary" type="button" :disabled="baziSaving" @click="saveBazi">
          {{ baziSaving ? '保存中…' : '保存生辰' }}
        </button>
        <p v-if="baziTip" class="muted">{{ baziTip }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  margin: 0 0 10px;
  font-size: 16px;
}

.mbti-title {
  margin-top: 16px;
}

.zodiac-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.zodiac-item,
.mbti-item {
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 10px;
  padding: 8px 4px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text);
}

.zodiac-item.active,
.mbti-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.mbti-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
}

.mbti-options {
  display: flex;
  gap: 8px;
}

.mbti-item {
  width: 40px;
}

.bazi-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bazi-card > p {
  margin: 0;
}

.bazi-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.bazi-input {
  flex: 1;
  max-width: 220px;
}

.bazi-options {
  display: flex;
  gap: 8px;
}

.bazi-item {
  width: 56px;
}

.bazi-checkbox {
  justify-content: flex-start;
}

.error-msg {
  margin: 0;
  color: #d63031;
  font-size: 13px;
}

.quiz-card,
.quiz-header,
.quiz-options {
  display: flex;
  gap: 10px;
}

.quiz-card,
.quiz-item {
  flex-direction: column;
}

.quiz-header {
  align-items: flex-start;
  justify-content: space-between;
}

.quiz-header .section-title,
.quiz-header p,
.quiz-prompt {
  margin: 0;
}

.quiz-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.quiz-options {
  flex-direction: column;
}

.quiz-choice {
  text-align: left;
  border: 1px solid var(--color-border);
  background: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  color: var(--color-text);
  font-size: 14px;
}

.quiz-choice.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.star-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 14px;
}
</style>
