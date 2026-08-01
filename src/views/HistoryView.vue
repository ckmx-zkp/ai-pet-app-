<script setup lang="ts">
// P5 历史：空态占位
// TODO(C3)：接入 GET /devices/{id}/messages，按日分组浏览与删除
</script>

<template>
  <div class="page">
    <h1 class="page-title">历史</h1>
    <div class="placeholder-block empty">
      还没有聊天记录，和宠物说第一句话吧
    </div>
  </div>
</template>

<style scoped>
.empty {
  min-height: 200px;
}
</style>
