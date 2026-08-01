<script setup lang="ts">
// P6 日运/小记：空态占位
// TODO(D2)：接入 GET /devices/{id}/analyses?kind=，展示今日卡片与历史小记
</script>

<template>
  <div class="page">
    <h1 class="page-title">日运 / 小记</h1>
    <div class="placeholder-block empty">
      聊几天后，这里会出现宠物的每日小记
    </div>
  </div>
</template>

<style scoped>
.empty {
  min-height: 200px;
}
</style>
