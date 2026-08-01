<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import http from '../api/http'
import type { PersonaPayload, PersonaProfile } from '../api/types'
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

const selectedMbti = computed(() => `${mbti.value.EI}${mbti.value.SN}${mbti.value.TF}${mbti.value.JP}`)

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
      errorMsg.value = '该星座或 MBTI 尚未发布，请先选择双鱼与 INFP/ISFP'
    } else {
      errorMsg.value = '保存失败，请稍后重试'
    }
  } finally {
    saving.value = false
  }
}

onMounted(loadPersona)
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

.error-msg {
  margin: 0;
  color: #d63031;
  font-size: 13px;
}

.empty {
  min-height: 160px;
}
</style>
