import { createRouter, createWebHistory } from 'vue-router'
import { TOKEN_KEY } from '../api/http'
import AppShell from '../layouts/AppShell.vue'
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/HomeView.vue'
import BindView from '../views/BindView.vue'
import PersonaView from '../views/PersonaView.vue'
import MemoriesView from '../views/MemoriesView.vue'
import HistoryView from '../views/HistoryView.vue'
import DailyView from '../views/DailyView.vue'
import PeripheralView from '../views/PeripheralView.vue'
import ProfileView from '../views/ProfileView.vue'
import TestsView from '../views/TestsView.vue'
import TestResultView from '../views/TestResultView.vue'
import StarPetView from '../views/StarPetView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', name: 'home', component: HomeView },
        { path: 'bind', name: 'bind', component: BindView },
        { path: 'persona', name: 'persona', component: PersonaView },
        { path: 'star', name: 'star', component: StarPetView },
        { path: 'memories', name: 'memories', component: MemoriesView },
        { path: 'history', name: 'history', component: HistoryView },
        { path: 'daily', name: 'daily', component: DailyView },
        { path: 'peripheral', name: 'peripheral', component: PeripheralView },
        { path: 'profile', name: 'profile', component: ProfileView },
        { path: 'tests', name: 'tests', component: TestsView },
        { path: 'tests/result', name: 'test-result', component: TestResultView }
      ]
    }
  ]
})

// 路由守卫：未登录访问业务页一律回登录页；已登录访问登录页回首页
router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY))
  if (to.name !== 'login' && !hasToken) {
    return { name: 'login' }
  }
  if (to.name === 'login' && hasToken) {
    return { name: 'home' }
  }
})

export default router
