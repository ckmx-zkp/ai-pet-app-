<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import http from '../api/http'
import type { AnalysisResult, BaziProfile, PersonaPayload, PersonaProfile } from '../api/types'
import { useDeviceStore } from '../stores/devices'

// P3 人设设置：星座 × MBTI × 忌口 × 钉扎。
// 当前已发布最小种子为双鱼、INFP/ISFP，其余选项待 KB 发布后由后端开放。
const zodiacs = [
  { key: 'aries', label: '白羊座' }, { key: 'taurus', label: '金牛座' },
  { key: 'gemini', label: '双子座' }, { key: 'cancer', label: '巨蟹座' },
  { key: 'leo', label: '狮子座' }, { key: 'virgo', label: '处女座' },
  { key: 'libra', label: '天秤座' }, { key: 'scorpio', label: '天蝎座' },
  { key: 'sagittarius', label: '射手座' }, { key: 'capricorn', label: '摩羯座' },
  { key: 'aquarius', label: '水瓶座' }, { key: 'pisces', label: '双鱼座' }
]

// MBTI 四维，每维二选一
const mbtiDims = [
  { key: 'EI', options: ['E', 'I'], label: '精力来源：外向 E / 内向 I' },
  { key: 'SN', options: ['S', 'N'], label: '认知方式：实感 S / 直觉 N' },
  { key: 'TF', options: ['T', 'F'], label: '判断方式：思考 T / 情感 F' },
  { key: 'JP', options: ['J', 'P'], label: '生活态度：判断 J / 知觉 P' }
] as const

const route = useRoute()
const devices = useDeviceStore()
const deviceId = computed(() => {
  const queryValue = Number(route.query.deviceId)
  if (Number.isSafeInteger(queryValue) && queryValue > 0) return queryValue
  return devices.activeDeviceId
})
const zodiac = ref('')
const mbti = ref<Record<string, string>>({ EI: '', SN: '', TF: '', JP: '' })
const taboo = ref('')
const pinned = ref(false)
const savedTip = ref('')
const errorMsg = ref('')
const loading = ref(false)
const saving = ref(false)

// D5 成长建议卡：服务端 persona_growth 分析产物（契约见 backend docs/06）
const growth = ref<AnalysisResult | null>(null)
const growthLoading = ref(false)
const growthError = ref('')
const applying = ref(false)
const applyTip = ref('')

// D7 主人八字（E10）：独立卡片读写 /devices/{id}/bazi；未录入 GET 404 视为空表单
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

function textValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value : ''
}

function listValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
}

const growthSummary = computed(() => (growth.value ? textValue(growth.value.payload, 'summary') : ''))
const growthEvidence = computed(() => (growth.value ? listValue(growth.value.payload, 'evidence') : []))
const growthApplied = computed(() => growth.value?.payload.applied === true)
const growthOverrides = computed(() => {
  const value = growth.value?.payload.suggested_overrides
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({
    key,
    value: typeof item === 'string' ? item : JSON.stringify(item)
  }))
})

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function applyProfile(profile: PersonaProfile) {
  zodiac.value = profile.sun_sign ?? ''
  const value = profile.mbti ?? ''
  mbti.value = { EI: value[0] ?? '', SN: value[1] ?? '', TF: value[2] ?? '', JP: value[3] ?? '' }
  const rawTaboo = profile.overrides.taboo
  taboo.value = Array.isArray(rawTaboo) ? rawTaboo.filter((item): item is string => typeof item === 'string').join('\n') : ''
  pinned.value = !profile.follow_latest
}

async function loadPersona() {
  if (!deviceId.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const { data } = await http.get<PersonaProfile>(`/devices/${deviceId.value}/persona`)
    applyProfile(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return
    errorMsg.value = '加载人设失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!deviceId.value) return
  if (!zodiac.value || selectedMbti.value.length !== 4) {
    errorMsg.value = '请选择星座并完成四个 MBTI 维度'
    return
  }
  saving.value = true
  errorMsg.value = ''
  savedTip.value = ''
  const payload: PersonaPayload = {
    sun_sign: zodiac.value,
    mbti: selectedMbti.value,
    overrides: { taboo: taboo.value.split('\n').map((item) => item.trim()).filter(Boolean) },
    follow_latest: !pinned.value
  }
  try {
    const { data } = await http.put<PersonaProfile>(`/devices/${deviceId.value}/persona`, payload)
    applyProfile(data)
    savedTip.value = '已保存，下次和宠物说话时生效'
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      errorMsg.value = '人设组合暂不可用，请检查选择后重试'
    } else {
      errorMsg.value = '保存失败，请稍后重试'
    }
  } finally {
    saving.value = false
  }
}

onMounted(loadPersona)

// 读取最近一条 persona_growth 建议（按 created_at 倒序，取第一条）
async function loadGrowth() {
  if (!deviceId.value) return
  growthLoading.value = true
  growthError.value = ''
  try {
    const { data } = await http.get<AnalysisResult[]>(`/devices/${deviceId.value}/analyses`, {
      params: { kind: 'persona_growth', limit: 1, offset: 0 }
    })
    growth.value = data[0] ?? null
  } catch {
    growthError.value = '加载成长建议失败，请稍后重试'
  } finally {
    growthLoading.value = false
  }
}

// 应用建议：二次确认后由后端把 suggested_overrides 合并进设备私有 overrides
async function applyGrowth() {
  if (!deviceId.value || !growth.value || applying.value) return
  if (!window.confirm('确认应用这份成长建议吗？建议内容将合并到当前设备的人设中。')) return
  applying.value = true
  growthError.value = ''
  applyTip.value = ''
  try {
    await http.post<AnalysisResult>(
      `/devices/${deviceId.value}/analyses/${growth.value.id}/apply-persona-growth`
    )
    applyTip.value = '已应用，下次和宠物说话时生效'
    // 应用会改写 overrides，需同时刷新人设表单与建议卡状态
    await Promise.all([loadPersona(), loadGrowth()])
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      growthError.value = '该建议已失效，请刷新后重试'
    } else if (axios.isAxiosError(error) && error.response?.status === 409) {
      growthError.value = '该建议暂无可应用内容，或尚未保存人设'
    } else {
      growthError.value = '应用失败，请稍后重试'
    }
  } finally {
    applying.value = false
  }
}

async function loadPage() {
  await Promise.all([loadPersona(), loadGrowth(), loadBazi()])
}

onMounted(loadPage)

function applyBazi(profile: BaziProfile) {
  baziCalendar.value = profile.calendar_type === 'lunar' ? 'lunar' : 'solar'
  baziDate.value = profile.birth_date
  // 响应 birth_time 序列化为 HH:MM:SS，input[type=time] 只认 HH:MM
  const time = profile.birth_time ?? ''
  baziTimeUnknown.value = !time
  baziTime.value = time.slice(0, 5)
  baziPlace.value = profile.birth_place ?? ''
  baziGender.value = profile.gender ?? ''
}

// 未录入时 GET 返回 404，按契约视为空表单，不报错
async function loadBazi() {
  if (!deviceId.value) return
  baziError.value = ''
  try {
    const { data } = await http.get<BaziProfile>(`/devices/${deviceId.value}/bazi`)
    applyBazi(data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return
    baziError.value = '加载八字失败，请稍后重试'
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

</script>

<template>
  <div class="page">
    <h1 class="page-title">人设设置</h1>
    <div v-if="!deviceId" class="placeholder-block empty">
      请先在绑定成功后进入本页设置人设。
    </div>
    <template v-else>
      <p v-if="loading" class="muted">正在加载人设…</p>
      <p class="muted">当前设备 ID：{{ deviceId }}</p>

    <!-- 星座：12 宫格单选 -->
    <div class="card">
      <h2 class="section-title">星座</h2>
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
    </div>

    <!-- MBTI：四维行选 -->
    <div class="card">
      <h2 class="section-title">MBTI</h2>
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
    </div>

    <!-- 忌口：多行文本 -->
    <div class="card">
      <h2 class="section-title">忌口（宠物不要提的话题）</h2>
      <textarea
        v-model="taboo"
        class="input taboo-input"
        rows="3"
        placeholder="每行一条，例如：不要聊数学题"
      ></textarea>
    </div>

    <!-- 钉扎开关：置顶当前人设，不跟随知识库更新 -->
    <div class="card pin-row">
      <div>
        <h2 class="section-title">钉扎人设</h2>
        <p class="muted">开启后不跟随知识库自动更新</p>
      </div>
      <label class="switch">
        <input v-model="pinned" type="checkbox" />
        <span class="slider"></span>
      </label>
    </div>

    <!-- D7 主人八字（E10）：独立卡片独立保存，读写 /devices/{id}/bazi -->
    <div class="card bazi-card">
      <h2 class="section-title">主人八字</h2>
      <p class="muted">用于生成每日八字运势，仅自己可见</p>
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
        {{ baziSaving ? '保存中…' : '保存八字' }}
      </button>
      <p v-if="baziTip" class="muted">{{ baziTip }}</p>
    </div>

    <!-- D5 成长建议卡：服务端 persona_growth 分析产物，应用后合并进设备私有 overrides -->
    <div class="card growth-card">
      <div class="growth-header">
        <h2 class="section-title">成长建议</h2>
        <span v-if="growthApplied" class="applied-badge">已应用</span>
      </div>
      <p v-if="growthLoading" class="muted">正在加载成长建议…</p>
      <template v-else-if="growth && growthSummary">
        <p class="growth-summary">{{ growthSummary }}</p>
        <p class="muted growth-time">生成于 {{ formatTime(growth.created_at) }}</p>
        <div v-if="growthOverrides.length" class="growth-overrides">
          <span class="muted">建议调整</span>
          <p v-for="item in growthOverrides" :key="item.key" class="muted">{{ item.key }}：{{ item.value }}</p>
        </div>
        <ul v-if="growthEvidence.length" class="growth-evidence">
          <li v-for="item in growthEvidence" :key="item">{{ item }}</li>
        </ul>
        <button
          v-if="!growthApplied && growthOverrides.length"
          class="btn-ghost"
          type="button"
          :disabled="applying"
          @click="applyGrowth"
        >
          {{ applying ? '应用中…' : '应用建议' }}
        </button>
        <p v-if="applyTip" class="muted">{{ applyTip }}</p>
      </template>
      <p v-else class="muted">暂时还没有成长建议。和宠物多聊聊，服务端会基于会话内容生成建议。</p>
      <p v-if="growthError" class="error-msg">{{ growthError }}</p>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    <button class="btn-primary" type="button" :disabled="loading || saving" @click="save">
      {{ saving ? '保存中…' : '保存' }}
    </button>
    <p v-if="savedTip" class="muted save-tip">{{ savedTip }}</p>
    </template>
  </div>
</template>

<style scoped>
.section-title {
  margin: 0 0 10px;
  font-size: 16px;
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

.taboo-input {
  resize: vertical;
  font-family: inherit;
}

.pin-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pin-row p {
  margin: 4px 0 0;
}

/* 开关（纯 CSS） */
.switch {
  position: relative;
  width: 48px;
  height: 28px;
  flex: none;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: var(--color-border);
  border-radius: 999px;
  transition: background 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.switch input:checked + .slider {
  background: var(--color-primary);
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

.save-tip {
  text-align: center;
}

/* D5 成长建议卡 */
.growth-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.growth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.growth-header .section-title {
  margin: 0;
}

.applied-badge {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: 99px;
  padding: 3px 10px;
  font-size: 12px;
}

.growth-summary {
  margin: 0;
  line-height: 1.65;
  white-space: pre-wrap;
}

.growth-time {
  margin: 0;
  font-size: 12px;
}

.growth-overrides p {
  margin: 2px 0 0;
  font-size: 13px;
}

.growth-evidence {
  margin: 0;
  padding-left: 20px;
  line-height: 1.7;
  font-size: 13px;
}

.error-msg {
  margin: 0;
  color: #d63031;
  font-size: 13px;
}

/* D7 主人八字卡 */
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

.empty {
  min-height: 160px;
}
</style>
