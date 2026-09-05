import { createRouter, createWebHistory } from 'vue-router'
import { TOKEN_KEY } from '../api/http'
import AppShell from '../layouts/AppShell.vue'
const LoginView = () => import('../views/LoginView.vue')
const HomeView = () => import('../views/HomeView.vue')
const BindView = () => import('../views/BindView.vue')
const PersonaView = () => import('../views/PersonaView.vue')
const MemoriesView = () => import('../views/MemoriesView.vue')
const HistoryView = () => import('../views/HistoryView.vue')
const DailyView = () => import('../views/DailyView.vue')
const PeripheralView = () => import('../views/PeripheralView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const TestsView = () => import('../views/TestsView.vue')
const TestResultView = () => import('../views/TestResultView.vue')
const StarPetView = () => import('../views/StarPetView.vue')
const OwnerView = () => import('../views/OwnerView.vue')

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
        { path: 'owner', name: 'owner', component: OwnerView },
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
