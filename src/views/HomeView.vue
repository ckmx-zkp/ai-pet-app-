<script setup lang="ts">
// P1 首页：宠物卡片（线框占位）+ 功能入口
// TODO(B2/C4)：接入 GET /devices 后，用真实设备数据替换占位卡片
</script>

<template>
  <div class="page">
    <h1 class="page-title">我的宠物</h1>

    <!-- 宠物卡片：空态线框（未绑定设备时引导添加） -->
    <div class="card pet-card">
      <div class="pet-avatar placeholder-block">宠物形象占位</div>
      <div class="pet-info">
        <p class="pet-name muted">还没有绑定设备</p>
        <p class="muted">在线状态：-- ｜ 最后活跃：--</p>
        <p class="muted">人设：-- 座 · MBTI --</p>
      </div>
    </div>

    <!-- 功能入口 -->
    <div class="entry-grid">
      <RouterLink class="btn-primary entry" :to="{ name: 'bind' }">绑定设备</RouterLink>
      <RouterLink class="btn-ghost entry" :to="{ name: 'persona' }">设置人设</RouterLink>
      <RouterLink class="btn-ghost entry" :to="{ name: 'daily' }">日运/小记</RouterLink>
      <RouterLink class="btn-ghost entry" :to="{ name: 'peripheral' }">外设状态</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.pet-card {
  display: flex;
  gap: 14px;
  align-items: center;
}

.pet-avatar {
  width: 96px;
  height: 96px;
  flex: none;
  min-height: 0;
  padding: 8px;
}

.pet-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pet-info p {
  margin: 0;
}

.pet-name {
  font-size: 16px;
  font-weight: 600;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.entry {
  text-align: center;
  text-decoration: none;
}
</style>
