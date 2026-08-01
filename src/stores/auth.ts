import { defineStore } from 'pinia'
import http, { TOKEN_KEY } from '../api/http'
import type { TokenResponse, User } from '../api/types'

interface AuthState {
  token: string
  user: User | null
}

/** 账号状态：Token 持久化 localStorage，动作直调真实后端 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    user: null
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token)
  },
  actions: {
    setToken(token: string) {
      this.token = token
      localStorage.setItem(TOKEN_KEY, token)
    },

    /** 登录：POST /auth/login */
    async login(loginName: string, password: string) {
      const { data } = await http.post<TokenResponse>('/auth/login', {
        login_name: loginName,
        password
      })
      this.setToken(data.access_token)
      await this.fetchMe()
    },

    /** 注册：POST /auth/register；成功后按已登录处理 */
    async register(loginName: string, password: string) {
      await http.post<User>('/auth/register', {
        login_name: loginName,
        password
      })
      // 后端注册只返回用户资料，不签发 Token；注册成功后立即完成登录。
      await this.login(loginName, password)
    },

    /** 拉取当前用户：GET /auth/me */
    async fetchMe() {
      const { data } = await http.get<User>('/auth/me')
      this.user = data
    },

    /** 退出登录：仅清本地，后端 JWT 无状态无需调用 */
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
    }
  }
})
