<script setup lang="ts">
// 响应式导航壳：三档断点（纯 CSS 媒体查询）
// <600px 底部 Tab；600–1024px 左侧 Navigation Rail；>1024px 左侧栏
const tabs = [
  { name: 'home', label: '首页', icon: '⌂' },
  { name: 'memories', label: '记忆', icon: '✦' },
  { name: 'history', label: '历史', icon: '☰' },
  { name: 'profile', label: '我的', icon: '◉' }
]
</script>

<template>
  <div class="shell">
    <nav class="shell-nav">
      <div class="nav-brand">守护星</div>
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        class="nav-item"
        :to="{ name: tab.name }"
      >
        <span class="nav-icon">{{ tab.icon }}</span>
        <span class="nav-label">{{ tab.label }}</span>
      </RouterLink>
    </nav>
    <main class="shell-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

/* 导航项通用 */
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--color-text-dim);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.nav-item.router-link-active {
  color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 600;
}

.nav-icon {
  font-size: 18px;
  line-height: 1;
}

/* —— <600px：底部 Tab —— */
.shell-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: #fff;
  border-top: 1px solid var(--color-border);
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  z-index: 10;
}

.nav-brand {
  display: none;
}

.shell-nav .nav-item {
  flex: 1;
  flex-direction: column;
  gap: 2px;
  padding: 6px 4px;
  font-size: 12px;
}

.shell-nav .nav-item.router-link-active {
  background: none;
}

.shell-main {
  padding-bottom: 72px;
}

/* —— 600–1024px：Navigation Rail（窄竖条，仅图标） —— */
@media (min-width: 600px) {
  .shell-nav {
    top: 0;
    right: auto;
    bottom: 0;
    width: 72px;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border-top: none;
    border-right: 1px solid var(--color-border);
    padding: 16px 8px;
  }

  .shell-nav .nav-item {
    flex: none;
    width: 100%;
  }

  .shell-nav .nav-label {
    display: none;
  }

  .shell-nav .nav-item.router-link-active {
    background: var(--color-primary-light);
  }

  .shell-main {
    padding-bottom: 0;
    margin-left: 72px;
  }
}

/* —— >1024px：左侧栏（图标 + 文字 + 品牌） —— */
@media (min-width: 1024px) {
  .shell-nav {
    width: 220px;
    align-items: stretch;
  }

  .nav-brand {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-primary);
    padding: 8px 12px 20px;
  }

  .shell-nav .nav-item {
    flex-direction: row;
  }

  .shell-nav .nav-label {
    display: inline;
  }

  .shell-main {
    margin-left: 220px;
  }
}
</style>
