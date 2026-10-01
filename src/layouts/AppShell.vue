<script setup lang="ts">
// 响应式导航壳：移动端悬浮胶囊 Tabbar + 桌面端自适应侧边栏
const tabs = [
  { name: 'home', label: '首页', icon: 'home' },
  { name: 'memories', label: '记忆', icon: 'sparkles' },
  { name: 'history', label: '历史', icon: 'history' },
  { name: 'profile', label: '我的', icon: 'user' }
]
</script>

<template>
  <div class="shell">
    <nav class="shell-nav">
      <div class="nav-brand">
        <span class="brand-sparkle">✦</span>
        <span>守护星</span>
      </div>
      <div class="nav-links">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.name"
          class="nav-item"
          :to="{ name: tab.name }"
        >
          <div class="icon-wrap">
            <!-- Home Icon -->
            <svg v-if="tab.icon === 'home'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <!-- Sparkles/Memories Icon -->
            <svg v-else-if="tab.icon === 'sparkles'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
            </svg>
            <!-- History Icon -->
            <svg v-else-if="tab.icon === 'history'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="8" y1="9" x2="16" y2="9"/>
              <line x1="8" y1="13" x2="14" y2="13"/>
            </svg>
            <!-- Profile/User Icon -->
            <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span class="nav-label">{{ tab.label }}</span>
        </RouterLink>
      </div>
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

/* 导航项基础 */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--color-text-dim);
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.nav-item:hover .icon-wrap {
  transform: translateY(-1px);
}

.nav-item.router-link-active {
  color: var(--color-primary);
  font-weight: 600;
}

/* —— 移动端 (<600px)：现代悬浮毛玻璃胶囊 Tabbar —— */
@media (max-width: 599.98px) {
  .shell-nav {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: calc(10px + env(safe-area-inset-bottom));
    display: flex;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 30px;
    padding: 6px 8px;
    box-shadow: 0 10px 30px rgba(45, 42, 74, 0.12), 0 2px 8px rgba(108, 92, 231, 0.08);
    z-index: 100;
  }

  .nav-brand {
    display: none;
  }

  .nav-links {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-around;
  }

  .nav-item {
    flex: 1;
    flex-direction: column;
    gap: 3px;
    padding: 6px 4px;
    font-size: 11px;
    border-radius: 20px;
  }

  .nav-item.router-link-active {
    background: rgba(108, 92, 231, 0.1);
  }

  .nav-item.router-link-active .icon-wrap {
    transform: scale(1.1);
  }

  .shell-main {
    padding-bottom: 84px;
  }
}

/* —— 平板端 (600–1024px)：Navigation Rail 悬浮侧栏 —— */
@media (min-width: 600px) and (max-width: 1023.98px) {
  .shell-nav {
    position: fixed;
    top: 20px;
    left: 20px;
    bottom: 20px;
    width: 68px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--color-border);
    border-radius: 24px;
    padding: 24px 8px;
    box-shadow: var(--shadow-float);
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 50;
  }

  .nav-brand {
    display: none;
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .nav-item {
    justify-content: center;
    padding: 12px;
    border-radius: 16px;
  }

  .nav-label {
    display: none;
  }

  .nav-item.router-link-active {
    background: var(--color-primary-light);
  }

  .shell-main {
    margin-left: 104px;
    padding-bottom: 24px;
  }
}

/* —— 桌面大屏 (>1024px)：沉浸式左侧品牌栏 —— */
@media (min-width: 1024px) {
  .shell-nav {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 240px;
    background: #fff;
    border-right: 1px solid var(--color-border);
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    z-index: 50;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 20px;
    font-weight: 800;
    color: var(--color-primary);
    padding: 12px 14px 28px;
    letter-spacing: -0.5px;
  }

  .brand-sparkle {
    font-size: 18px;
    animation: rotate-sparkle 6s linear infinite;
  }

  @keyframes rotate-sparkle {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .nav-item {
    padding: 12px 16px;
  }

  .nav-item.router-link-active {
    background: var(--color-primary-light);
  }

  .shell-main {
    margin-left: 240px;
    padding-bottom: 24px;
  }
}
</style>
