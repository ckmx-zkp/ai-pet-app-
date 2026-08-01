/// <reference types="vite/client" />

// 环境变量类型补充（对应 .env.example）
interface ImportMetaEnv {
  /** 后端 API 基础地址，缺省走代码内默认值（公网内测环境） */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
