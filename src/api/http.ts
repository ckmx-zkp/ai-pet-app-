import axios from 'axios'

/** localStorage 中保存 JWT 的键名（auth store 与拦截器共用） */
export const TOKEN_KEY = 'ai_pet_token'

/** 后端 API 基础地址：优先环境变量，缺省为公网内测环境 */
export const API_BASE =
  import.meta.env.VITE_API_BASE ?? '/api'

/** 统一 axios 实例 */
const http = axios.create({
  baseURL: API_BASE,
  timeout: 15000
})

// 请求拦截：注入 Bearer Token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：401 清 Token 并回登录页（与 docs/05 错误约定一致）
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default http
