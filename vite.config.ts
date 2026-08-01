import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// 构建配置：Vue 3 + PWA（自动更新 Service Worker）
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa.svg'],
      manifest: {
        name: 'AI Pet',
        short_name: 'AI Pet',
        description: 'AI Pet 用户端：绑定设备、设定人设、查看记忆与日运',
        lang: 'zh-CN',
        start_url: '/',
        display: 'standalone',
        theme_color: '#6c5ce7',
        background_color: '#efedfc',
        icons: [
          {
            src: 'pwa.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      devOptions: {
        // 开发环境不启用 SW，避免缓存干扰调试
        enabled: false
      }
    })
  ]
})
