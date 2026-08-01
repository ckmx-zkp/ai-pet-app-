<script setup lang="ts">
// P7 外设状态：空态占位（只读）
// TODO(D1)：接入 GET /devices/{id}/peripheral，展示 emotion / gaze / 更新时间
</script>

<template>
  <div class="page">
    <h1 class="page-title">外设状态</h1>
    <div class="placeholder-block empty">
      设备上线后，这里会显示表情与视线状态
    </div>
    <p class="muted">说明：表情与动作由宠物本体执行，这里只读展示。</p>
  </div>
</template>

<style scoped>
.empty {
  min-height: 200px;
}
</style>
