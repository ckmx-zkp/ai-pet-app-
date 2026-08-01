<script setup lang="ts">
// P4 记忆：空态占位
// TODO(C2)：接入 GET /devices/{id}/memories（列表/搜索/新建/删除/候选审核）
</script>

<template>
  <div class="page">
    <h1 class="page-title">记忆</h1>
    <div class="placeholder-block empty">
      还没有记忆，先去和宠物聊天吧
    </div>
  </div>
</template>

<style scoped>
.empty {
  min-height: 200px;
}
</style>
