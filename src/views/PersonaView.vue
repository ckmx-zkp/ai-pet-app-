<script setup lang="ts">
import { ref } from 'vue'

// P3 人设设置：星座 × MBTI × 忌口 × 钉扎（仅前端交互，接口下一步接）
const zodiacs = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'
]

// MBTI 四维，每维二选一
const mbtiDims = [
  { key: 'EI', options: ['E', 'I'], label: '精力来源：外向 E / 内向 I' },
  { key: 'SN', options: ['S', 'N'], label: '认知方式：实感 S / 直觉 N' },
  { key: 'TF', options: ['T', 'F'], label: '判断方式：思考 T / 情感 F' },
  { key: 'JP', options: ['J', 'P'], label: '生活态度：判断 J / 知觉 P' }
] as const

const zodiac = ref('')
const mbti = ref<Record<string, string>>({ EI: '', SN: '', TF: '', JP: '' })
const taboo = ref('')
const pinned = ref(false)
const savedTip = ref('')

function save() {
  // TODO(C1)：接入 PUT /devices/{id}/persona，保存成功 Toast 文案：
  // “已保存，下次和宠物说话时生效”
  savedTip.value = '已暂存（接口接入后真正生效）'
  setTimeout(() => (savedTip.value = ''), 2000)
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">人设设置</h1>

    <!-- 星座：12 宫格单选 -->
    <div class="card">
      <h2 class="section-title">星座</h2>
      <div class="zodiac-grid">
        <button
          v-for="z in zodiacs"
          :key="z"
          type="button"
          class="zodiac-item"
          :class="{ active: zodiac === z }"
          @click="zodiac = z"
        >
          {{ z }}
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

    <button class="btn-primary" type="button" @click="save">保存</button>
    <p v-if="savedTip" class="muted save-tip">{{ savedTip }}</p>
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
</style>
