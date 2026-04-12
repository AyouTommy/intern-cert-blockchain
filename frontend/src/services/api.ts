import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

// ==========================================
//! 【前端核心】请求封装 — 所有前端请求都经过这个文件
// 做3件事:
//   ① 自动读取后端地址（部署时从环境变量读取）
//   ② 自动给每个请求带上登录令牌
//   ③ 处理Render免费服务器的冷启动重试逻辑
// ==========================================

// 动态获取后端地址
const getApiBaseUrl = () => {
  //! 【部署关键】生产环境从环境变量读取后端地址
  // 在Vercel后台配置: VITE_API_URL = 后端 Render 地址
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // 本地开发使用代理
  return '/api'
}

// 冷启动提示 toast ID，用于更新同一个 toast
let coldStartToastId: string | undefined

//! 【部署关键】超时设为60秒，因为Render免费服务器休眠后科启动需要30-50秒
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000, // 增加到 60 秒以应对 Render 冷启动
  headers: {
    'Content-Type': 'application/json',
  },
})

// 重试配置
const MAX_RETRIES = 2
const RETRY_DELAY = 3000

//! 【部署关键】冷启动重试逻辑
// Render免费服务器休眠后第一次访问会超时，这里自动重试最多2次
// 并显示"服务器启动中"的提示，用户体验更好
const retryRequest = async (error: AxiosError, retryCount: number = 0): Promise<unknown> => {
  const config = error.config
  if (!config) return Promise.reject(error)

  // 只对网络错误和 503 错误重试
  const shouldRetry =
    !error.response || // 网络错误
    error.response.status === 503 || // 服务不可用（冷启动）
    error.code === 'ECONNABORTED' // 超时

  if (shouldRetry && retryCount < MAX_RETRIES) {
    // 显示冷启动提示
    if (retryCount === 0) {
      coldStartToastId = toast.loading(
        '🚀 服务器正在启动中，请稍候...\n（免费服务器休眠后需要约 30-50 秒唤醒）',
        { duration: 60000, id: coldStartToastId }
      )
    } else {
      toast.loading(
        `🔄 正在重试 (${retryCount + 1}/${MAX_RETRIES})...`,
        { id: coldStartToastId }
      )
    }

    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))

    try {
      const response = await api.request(config)
      // 成功后关闭提示
      if (coldStartToastId) {
        toast.success('✅ 服务器已启动！', { id: coldStartToastId })
        coldStartToastId = undefined
      }
      return response
    } catch (retryError) {
      return retryRequest(retryError as AxiosError, retryCount + 1)
    }
  }

  // 重试次数用尽，关闭冷启动提示
  if (coldStartToastId) {
    toast.dismiss(coldStartToastId)
    coldStartToastId = undefined
  }

  return Promise.reject(error)
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // 如果有冷启动提示还在显示，关闭它
    if (coldStartToastId) {
      toast.success('✅ 服务器已启动！', { id: coldStartToastId })
      coldStartToastId = undefined
    }
    return response
  },
  async (error: AxiosError) => {
    // 检查是否需要重试（冷启动场景）
    const shouldRetry =
      !error.response || // 网络错误
      error.response.status === 503 || // 服务不可用
      error.code === 'ECONNABORTED' // 超时

    if (shouldRetry) {
      try {
        return await retryRequest(error)
      } catch {
        // 重试失败，继续正常错误处理
      }
    }

    const message = error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
      ? (error.response.data as { message: string }).message
      : error.message || '请求失败'

    if (error.response?.status === 401) {
      // 检查是否在登录页面 - 如果是，显示后端返回的错误消息（如密码错误）
      const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      if (isLoginPage) {
        // 登录/注册页面的401错误，显示后端返回的具体错误信息
        toast.error(message)
      } else {
        // Token expired or invalid - 非登录页面的401错误，说明token过期
        sessionStorage.removeItem('auth-storage')
        window.location.href = '/login'
        toast.error('登录已过期，请重新登录')
      }
    } else if (error.response?.status === 403) {
      toast.error(message || '权限不足')
    } else if (error.response?.status === 404) {
      toast.error(message || '资源不存在')
    } else if (error.response?.status === 503) {
      toast.error('服务器正在启动中，请稍后刷新页面重试')
    } else if (error.response?.status && error.response.status >= 500) {
      toast.error('服务器错误，请稍后重试')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('请求超时，服务器可能正在启动，请刷新页面重试')
    } else {
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

export default api

// API Types
export interface PaginatedResponse<T> {
  success: boolean
  data: {
    items: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export interface Certificate {
  id: string
  certNumber: string
  status: 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'FAILED'
  position: string
  department?: string
  startDate: string
  endDate: string
  description?: string
  evaluation?: string
  certHash?: string
  txHash?: string
  blockNumber?: number
  chainId?: number
  verifyCode: string
  verifyUrl?: string
  qrCode?: string
  issuedAt?: string
  revokedAt?: string
  createdAt: string
  student: {
    id: string
    studentId: string
    user: {
      name: string
      email?: string
    }
  }
  university: {
    id: string
    code: string
    name: string
    logo?: string
  }
  company: {
    id: string
    code: string
    name: string
    logo?: string
  }
  issuer?: {
    id: string
    name: string
  }
  attachments?: {
    id: string
    fileName: string
    originalName: string
    fileSize: number
    mimeType: string
    category: string
    description?: string
  }[]
  verifications?: {
    id: string
    createdAt: string
    verifierIp?: string
    isValid: boolean
  }[]
  evaluatedAt?: string  // 企业评价时间
  approvedAt?: string   // 高校审核时间
  revokeReason?: string
  // 多方确认信息
  universityAddr?: string  // 高校链上确认地址
  companyAddr?: string     // 企业链上确认地址
  contentHash?: string     // 内容完整性哈希
  // 上链重试信息
  retryCount?: number
  lastRetryAt?: string
  failReason?: string
}

export interface University {
  id: string
  code: string
  name: string
  englishName?: string
  province?: string
  city?: string
  address?: string
  logo?: string
  website?: string
  isVerified: boolean
  _count?: {
    certificates: number
  }
}

export interface Company {
  id: string
  code: string
  name: string
  englishName?: string
  industry?: string
  scale?: string
  province?: string
  city?: string
  logo?: string
  website?: string
  isVerified: boolean
  _count?: {
    certificates: number
  }
}

export interface DashboardStats {
  overview: {
    totalCertificates: number
    activeCertificates: number
    pendingCertificates: number
    revokedCertificates: number
    totalUniversities: number
    totalCompanies: number
    totalStudents: number
    recentVerifications: number
  }
  trend: {
    date: string
    created: number
    active: number
  }[]
  blockchain?: {
    total: number
    active: number
    revoked: number
  }
}
